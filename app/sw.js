/* Service worker — La Bàn Tự Do Tài Chính
   App tĩnh hoàn toàn nên dùng cache-first cho app shell.
   Mọi thao tác cache đều bọc try/catch: service worker hỏng không được làm app chết.

   ĐỔI PHIÊN BẢN mỗi lần sửa app, nếu không điện thoại sẽ giữ mãi bản cũ.
*/
const PHIEN_BAN = "la-ban-v1.1.0";
const CACHE_SHELL = PHIEN_BAN + "-shell";
const CACHE_FONT = PHIEN_BAN + "-font";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon-32.png"
];

/* Google Fonts là host ngoài duy nhất app dùng — cache lại để offline vẫn đúng chữ. */
const HOST_FONT = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const c = await caches.open(CACHE_SHELL);
      // addAll hỏng nguyên lô nếu một file lỗi, nên nạp lẻ từng cái
      await Promise.all(SHELL.map(async url => {
        try { await c.add(new Request(url, { cache: "reload" })); }
        catch (e) { /* thiếu một file thì bỏ qua, không chặn cài đặt */ }
      }));
    } catch (e) { /* không mở được cache thì thôi */ }
    try { await self.skipWaiting(); } catch (e) { }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const ten = await caches.keys();
      await Promise.all(ten
        .filter(k => k.startsWith("la-ban-") && !k.startsWith(PHIEN_BAN))
        .map(k => caches.delete(k)));
    } catch (e) { }
    try { await self.clients.claim(); } catch (e) { }
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // font: cache-first, nếu chưa có thì tải và lưu lại
  if (HOST_FONT.includes(url.hostname)) {
    event.respondWith((async () => {
      try {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        try {
          const c = await caches.open(CACHE_FONT);
          await c.put(req, res.clone());
        } catch (e) { }
        return res;
      } catch (e) {
        const hit = await caches.match(req);
        return hit || Response.error();
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // điều hướng trang: trả index.html từ cache, mạng chỉ để làm mới
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const hit = await caches.match("./index.html");
        if (hit) {
          // làm mới ngầm cho lần mở sau
          fetch(req).then(async res => {
            if (res && res.ok) {
              try { const c = await caches.open(CACHE_SHELL); await c.put("./index.html", res.clone()); } catch (e) { }
            }
          }).catch(() => { });
          return hit;
        }
        return await fetch(req);
      } catch (e) {
        const hit = await caches.match("./index.html");
        return hit || Response.error();
      }
    })());
    return;
  }

  // tài nguyên cùng nguồn: cache-first
  event.respondWith((async () => {
    try {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) {
        try { const c = await caches.open(CACHE_SHELL); await c.put(req, res.clone()); } catch (e) { }
      }
      return res;
    } catch (e) {
      const hit = await caches.match(req);
      return hit || Response.error();
    }
  })());
});

/* Cho phép trang yêu cầu bản mới ngay lập tức khi người dùng bấm nút cập nhật. */
self.addEventListener("message", event => {
  if (event.data === "bo-qua-cho") { try { self.skipWaiting(); } catch (e) { } }
});
