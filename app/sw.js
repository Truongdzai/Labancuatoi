/* Service worker — La Bàn Tự Do Tài Chính
   App tĩnh hoàn toàn nên dùng cache-first cho app shell.
   Mọi thao tác cache đều bọc try/catch: service worker hỏng không được làm app chết.

   ĐỔI PHIÊN BẢN mỗi lần sửa app, nếu không điện thoại sẽ giữ mãi bản cũ.
*/
const PHIEN_BAN = "la-ban-v1.3.0";
const CACHE_SHELL = PHIEN_BAN + "-shell";
const CACHE_FONT = PHIEN_BAN + "-font";

const SHELL = [
  "./",
  "./index.html",
  "./ai-worker.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon-32.png"
];

/* Google Fonts là host ngoài duy nhất app dùng — cache lại để offline vẫn đúng chữ. */
const HOST_FONT = ["fonts.googleapis.com", "fonts.gstatic.com"];

/* Chart.js và thư viện WebLLM đều tải từ jsDelivr. Cùng cách xử lý như font:
   lần đầu online thì tải và giữ lại, từ đó offline vẫn dùng được. */
const HOST_CDN = ["cdn.jsdelivr.net"];
const CACHE_CDN = PHIEN_BAN + "-cdn";

/* Trọng số mô hình (Hugging Face) và tệp nhân WebGPU (GitHub) CỐ Ý không đụng tới.
   Chúng nặng vài trăm MB và WebLLM đã tự quản lý kho riêng của nó; service worker
   xen vào chỉ tổ nhân đôi dung lượng trên máy người dùng. Nhánh khác nguồn ở dưới
   sẽ tự bỏ qua chúng — liệt kê ở đây để người đọc sau biết là có chủ ý. */
const HOST_MO_HINH = ["huggingface.co", "cdn-lfs.hf.co", "cdn-lfs-us-1.hf.co", "raw.githubusercontent.com"];

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
      // CHỈ xoá kho của chính app này. Kho của WebLLM tên khác hẳn ("webllm/…")
      // nên nâng phiên bản app KHÔNG làm người dùng mất mô hình vài trăm MB đã tải.
      // Đây là lý do bộ lọc phải bám vào tiền tố "la-ban-", đừng nới rộng nó ra.
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

  // font và thư viện CDN: cache-first, chưa có thì tải rồi lưu lại
  if (HOST_FONT.includes(url.hostname) || HOST_CDN.includes(url.hostname)) {
    const kho = HOST_CDN.includes(url.hostname) ? CACHE_CDN : CACHE_FONT;
    event.respondWith((async () => {
      try {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        try {
          const c = await caches.open(kho);
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

  // data.json: mạng trước, cache chỉ để dùng khi mất mạng.
  // Nếu để cache-first thì số liệu thị trường sẽ đứng im mãi ở bản đầu tiên.
  if (url.pathname.endsWith("/data.json")) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" });
        if (res && res.ok) {
          try { const c = await caches.open(CACHE_SHELL); await c.put(req, res.clone()); } catch (e) { }
        }
        return res;
      } catch (e) {
        const hit = await caches.match(req);
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
