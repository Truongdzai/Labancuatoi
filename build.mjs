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

// Regex trên tham lam: nó lấy từ thẻ <script> TRẦN đầu tiên tới </script> CUỐI cùng.
// Nên mọi thẻ script có thuộc tính (CDN chẳng hạn) phải nằm TRƯỚC khối script chính,
// nếu không phần đánh dấu HTML sẽ lọt vào chuỗi JS và bước kiểm cú pháp vỡ vô cớ.
bao(!/<script>[\s\S]*<script\s/.test(app),
    "mọi thẻ <script src> nằm trước khối script chính");
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

// --- tab Lộ trình Lãi kép: nút, panel và Chart.js phải khớp nhau ---
bao(app.includes('data-t="lk"') && app.includes('id="p-lk"'), "tab Lãi kép có cả nút lẫn panel");
bao(/id="chartjs-cdn"[^>]*integrity="sha384-/.test(app), "thẻ Chart.js có khoá SRI");
bao(app.includes('id="lk-canvas"'), "có canvas cho biểu đồ lãi kép");

// --- trợ lý AI: ô giao diện và hàm suy luận phải đi cùng nhau ---
bao(app.includes('id="aibox"') && app.includes("async function generateLocalAIAnalysis"),
    "trợ lý AI có cả ô lẫn hàm generateLocalAIAnalysis");

// --- số liệu tự động ---
bao(app.includes('fetch("./data.json"'), "app có đọc data.json");
if (existsSync("app/data.json")) {
  try {
    const d = JSON.parse(readFileSync("app/data.json", "utf8"));
    const n = Object.keys(d.ma || {}).length;
    bao(n > 0, `data.json hợp lệ — ${n} mã, phiên ${d.phien || "?"}`);
  } catch (e) { bao(false, "data.json hỏng: " + e.message); }
} else {
  console.log("  · chưa có app/data.json — app vẫn chạy, người dùng nhập tay");
}

// --- các file trong SHELL của sw phải tồn tại thật ---
// data.json cố ý không nằm trong SHELL: nó phải đi mạng trước, xem sw.js.
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
