/* Kiểm cú pháp app/index.html rồi sinh bản một-file ở thư mục gốc.

   app/index.html là NGUỒN DUY NHẤT. La-Ban-Tu-Do-Tai-Chinh.html ở gốc chỉ là
   bản sao để mở nhanh trên máy tính bằng cách nhấp đúp — đừng sửa file đó,
   mỗi lần build nó bị ghi đè.

   Khi mở bằng file:// thì service worker tự tắt (có kiểm tra protocol) và
   link manifest 404 vô hại, nên bản sao chạy y hệt, chỉ không cài được thôi.

   Chạy:  node build.mjs
*/
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const SRC = "app/index.html";
const OUT = "La-Ban-Tu-Do-Tai-Chinh.html";
const SW = "app/sw.js";

let loi = 0;
const bao = (ok, s) => { console.log((ok ? "  ✓ " : "  ✗ ") + s); if (!ok) loi++; };

if (!existsSync(SRC)) { console.error("Không thấy " + SRC); process.exit(1); }
const app = readFileSync(SRC, "utf8");

console.log("Kiểm tra " + SRC);

// --- cú pháp khối <script> ---
const js = app.match(/<script>([\s\S]*)<\/script>/);
if (!js) { console.error("Không tìm thấy khối <script>."); process.exit(1); }
try { new vm.Script(js[1], { filename: "index.html:<script>" }); bao(true, "cú pháp JS hợp lệ"); }
catch (e) { bao(false, "lỗi cú pháp JS: " + e.message); process.exit(1); }

// --- các file PWA phải có mặt ---
for (const f of ["app/manifest.webmanifest", SW,
  "app/icons/icon-192.png", "app/icons/icon-512.png",
  "app/icons/icon-maskable-512.png", "app/icons/favicon-32.png"]) {
  bao(existsSync(f), f);
}

// --- manifest hợp lệ ---
try {
  const m = JSON.parse(readFileSync("app/manifest.webmanifest", "utf8"));
  bao(!!m.name && !!m.short_name, "manifest có name và short_name");
  bao(m.display === "standalone", "display = standalone");
  bao(m.start_url === "./" && m.scope === "./", "start_url và scope là đường dẫn tương đối");
  bao(m.icons.some(i => (i.purpose || "").includes("maskable")), "có icon maskable");
  bao(m.icons.every(i => existsSync(join("app", i.src))), "mọi icon khai báo đều tồn tại");
} catch (e) { bao(false, "manifest hỏng: " + e.message); }

// --- service worker phải có version string và dọn cache cũ ---
const sw = readFileSync(SW, "utf8");
const ver = sw.match(/PHIEN_BAN\s*=\s*"([^"]+)"/);
bao(!!ver, "service worker có chuỗi phiên bản" + (ver ? ": " + ver[1] : ""));
bao(/caches\.delete/.test(sw), "service worker có dọn cache cũ ở activate");

// --- app phải trỏ đúng tới manifest và sw ---
bao(app.includes('href="./manifest.webmanifest"'), "index.html liên kết manifest");
bao(app.includes('navigator.serviceWorker.register("./sw.js"'), "index.html đăng ký sw.js");
bao(app.includes('viewport-fit=cover'), "viewport có viewport-fit=cover");

// --- các file trong SHELL của sw phải tồn tại thật ---
const shell = (sw.match(/const SHELL = \[([\s\S]*?)\]/) || [, ""])[1]
  .split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(s => s && s !== "./");
for (const f of shell) bao(existsSync(join("app", f)), "SHELL: " + f);

if (loi) { console.error(`\n${loi} vấn đề — không sinh file.`); process.exit(1); }

writeFileSync(OUT, app, "utf8");
const kb = n => (n / 1024).toFixed(0) + " KB";
console.log(`\n${OUT} — ${kb(app.length)} (bản một-file, mở bằng nhấp đúp)`);

let tong = 0;
const di = d => readdirSync(d).forEach(f => {
  const p = join(d, f); const s = statSync(p);
  s.isDirectory() ? di(p) : tong += s.size;
});
di("app");
console.log(`app/ — ${kb(tong)} (bản PWA, đưa lên hosting)`);
