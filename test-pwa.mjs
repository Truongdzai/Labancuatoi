/* Kiểm thử PWA: manifest hợp lệ, service worker đăng ký được, tắt mạng vẫn tải.
   Tự bật máy chủ tĩnh rồi lái Chrome qua DevTools Protocol. Không cần cài gì.

   Chạy:  node test-pwa.mjs
*/
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].find(existsSync);
if (!CHROME) { console.error("Không tìm thấy Chrome hoặc Edge."); process.exit(1); }

const WEB = 8137, PORT = 9701;
const PROFILE = resolve(tmpdir(), "htdtc-pwa-" + process.pid);
const URL_ = `http://localhost:${WEB}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let loi = 0;
const bao = (ok, s, them = "") => { console.log((ok ? "  ✓ " : "  ✗ ") + s + (them ? " — " + them : "")); if (!ok) loi++; };

const web = spawn(process.execPath, ["serve.mjs", String(WEB)], { stdio: "ignore" });
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "about:blank"
], { stdio: "ignore" });

function done(code) {
  try { web.kill(); } catch { }
  try { chrome.kill(); } catch { }
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { }
  process.exit(code);
}

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find(t => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch { }
    await sleep(250);
  }
  throw new Error("Chrome không mở được cổng debug");
}

const ws = new WebSocket(await target());
await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = () => bad(new Error("WebSocket lỗi")); });

let id = 0; const cho = new Map(); const loiTrang = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && cho.has(m.id)) {
    const { ok, bad } = cho.get(m.id); cho.delete(m.id);
    m.error ? bad(new Error(m.error.message)) : ok(m.result);
  }
  if (m.method === "Runtime.exceptionThrown") {
    loiTrang.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
};
const send = (method, params = {}) => new Promise((ok, bad) => {
  const i = ++id; cho.set(i, { ok, bad });
  ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (cho.has(i)) { cho.delete(i); bad(new Error("hết giờ: " + method)); } }, 30000);
});
const ev = async e => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 393, height: 851, deviceScaleFactor: 2, mobile: true });

console.log("PWA — " + URL_);

// ---------- 1. tải trang ----------
await send("Page.navigate", { url: URL_ });
await sleep(1800);
bao(await ev(`document.title`) === "La Bàn Tự Do Tài Chính", "trang tải được qua http");

// ---------- 2. manifest ----------
const man = await ev(`(async()=>{
  const l=document.querySelector('link[rel="manifest"]'); if(!l) return null;
  const r=await fetch(l.href); return {ok:r.ok, ct:r.headers.get('content-type'), body:await r.text()};})()`);
bao(!!man && man.ok, "tải được manifest.webmanifest");
let M = null;
try { M = JSON.parse(man.body); } catch { }
bao(!!M, "manifest là JSON hợp lệ");
if (M) {
  bao(M.name === "La Bàn Tự Do Tài Chính", "name", M.name);
  bao(M.short_name === "La Bàn", "short_name", M.short_name);
  bao(M.display === "standalone", "display", M.display);
  bao(M.start_url === "./" && M.scope === "./", "start_url / scope");
  bao(!!M.theme_color && !!M.background_color, "theme_color + background_color", M.theme_color + " / " + M.background_color);
  bao(M.icons.length >= 3, "số icon", String(M.icons.length));
  bao(M.icons.some(i => (i.purpose || "").includes("maskable")), "có icon maskable");
  const tai = await ev(`(async()=>{const r=await Promise.all(${JSON.stringify(M.icons.map(i => i.src))}
    .map(s=>fetch(s).then(x=>x.ok).catch(()=>false))); return r.every(Boolean);})()`);
  bao(tai, "mọi icon tải được thật");
}

// ---------- 3. service worker ----------
const sw = await ev(`(async()=>{
  const r = await navigator.serviceWorker.getRegistration();
  if(!r) return {co:false};
  await navigator.serviceWorker.ready;
  return {co:true, scope:r.scope, active:!!r.active, state:r.active&&r.active.state};})()`);
bao(sw.co, "service worker đã đăng ký");
bao(sw.active && sw.state === "activated", "service worker đang hoạt động", sw.state || "");
bao((sw.scope || "").endsWith("/"), "scope", sw.scope || "");

const cache = await ev(`(async()=>{const k=await caches.keys();
  const c=await caches.open(k.find(x=>x.includes('shell'))||k[0]);
  const r=await c.keys(); return {keys:k, so:r.length};})()`);
bao(cache.keys.length > 0, "đã tạo cache", cache.keys.join(", "));
bao(cache.so >= 5, "số file trong cache shell", String(cache.so));

// ---------- 4. tắt mạng ----------
await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send("Page.navigate", { url: URL_ });
await sleep(2000);
const off = await ev(`(()=>({
  title: document.title,
  tabs: document.querySelectorAll('#tabs button').length,
  the: document.querySelectorAll('#kb .kcard').length,
  moc: !!document.getElementById('tiles')
}))()`);
bao(off.title === "La Bàn Tự Do Tài Chính", "TẮT MẠNG — trang vẫn tải");
bao(off.tabs === 7, "TẮT MẠNG — đủ 7 tab", String(off.tabs));
bao(off.the === 196, "TẮT MẠNG — đủ 196 thẻ cẩm nang", String(off.the));

const luu = await ev(`(()=>{try{localStorage.setItem('htdtc.thu','1');
  const v=localStorage.getItem('htdtc.thu'); localStorage.removeItem('htdtc.thu'); return v==='1';}catch(e){return false}})()`);
bao(luu, "TẮT MẠNG — localStorage vẫn ghi được");

await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// ---------- 5. không có lỗi trang ----------
const that = loiTrang.filter(m => !/fonts\.g|Failed to fetch|ERR_INTERNET|ERR_NAME/i.test(m));
bao(that.length === 0, "không có pageerror", that.join(" | "));

console.log(loi ? `\n${loi} vấn đề` : "\nPWA: sạch — cài được lên điện thoại");
done(loi ? 1 : 0);
