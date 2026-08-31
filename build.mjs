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
for (const f of ["app/manifest.webmanifest", SW, "app/ai-worker.js",
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

// --- trợ lý AI: ô giao diện, hộp xin phép, và hai đường suy luận ---
bao(app.includes('id="aibox"') && app.includes("async function generateLocalAIAnalysis"),
    "trợ lý AI có cả ô lẫn hàm generateLocalAIAnalysis");
bao(app.includes('id="ai-activate"') && app.includes('id="ai-status"'),
    "có nút kích hoạt và ô trạng thái mô hình");
bao(app.includes('<dialog id="ai-hoi"'), "có hộp xin phép trước khi tải mô hình");
bao(/@mlc-ai\/web-llm@\d+\.\d+\.\d+\//.test(app), "WebLLM được ghim đúng phiên bản");
bao(app.includes("function phanTichTheoLuat"),
    "vẫn còn bộ luật dự phòng khi không có mô hình");
// Mô hình sinh chữ tự do; đưa thẳng vào innerHTML là mở cửa cho XSS.
bao(/esc\(cau\)/.test(app), "chữ do mô hình sinh ra được esc() trước khi hiện");
// Mô hình 0,5B đã từng bịa ra dòng điểm "4/13 (35%)". Hàng rào này chặn việc đó.
bao(app.includes("function hopLeCau"), "có hàng rào loại bỏ chữ mô hình bịa số");
// Chạy mô hình trên luồng chính làm đứng hình cả tab — phải là worker.
// Bắt lời GỌI thật (`await CreateMLCEngine(`), không bắt tên hàm nhắc trong ghi chú.
bao(app.includes("CreateWebWorkerMLCEngine") && !/await\s+CreateMLCEngine\s*\(/.test(app),
    "mô hình chạy trong luồng phụ, không phải luồng chính");
// Đã gặp lời gọi sinh chữ không bao giờ trả về. Không có hàng rào này thì nút kẹt vĩnh viễn.
bao(app.includes("AI_HAN_GIAY") && /Promise\.race\(\[chay, hetGio\]\)/.test(app),
    "lời gọi mô hình có hàng rào thời gian");
// hasModelInCache() kéo theo 6,5 MB thư viện, mà việc dò cache chạy mỗi lần mở app.
// Chỉ cấm việc IMPORT nó — nhắc tên trong ghi chú giải thích thì vẫn được.
bao(!/\{[^}]*hasModelInCache[^}]*\}\s*=\s*await import/.test(app),
    "không import thư viện WebLLM chỉ để dò cache lúc mở app");

/* ---------- BẤT BIẾN NỘI DUNG ----------
   Ba con số này là xương sống của app. Mọi lần refactor đều phải giữ nguyên,
   nên khoá cứng ở đây: sai một thẻ là build hỏng, không cần ai để ý bằng mắt. */
{
  // cắt `const KB = [ … ]` bằng cách đếm ngoặc, bỏ qua ngoặc nằm trong chuỗi
  const cat = (ten) => {
    const d = js[1].indexOf(`const ${ten} = [`);
    if (d < 0) return null;
    const s = d + `const ${ten} = `.length;
    let sau = 0, nhay = null, thoat = false;
    for (let i = s; i < js[1].length; i++) {
      const c = js[1][i];
      if (thoat) { thoat = false; continue; }
      if (nhay) { if (c === "\\") thoat = true; else if (c === nhay) nhay = null; continue; }
      if (c === '"' || c === "'" || c === "`") { nhay = c; continue; }
      if ("[{(".includes(c)) sau++;
      if ("]})".includes(c)) { sau--; if (sau === 0) return js[1].slice(s, i + 1); }
    }
    return null;
  };
  const nguon = cat("KB");
  if (!nguon) { bao(false, "không cắt được mảng KB"); }
  else {
    const KB = new vm.Script("(" + nguon + ")").runInNewContext();
    const nhom = new Set(KB.map(k => k.g));
    bao(KB.length === 196, `196 thẻ cẩm nang — đếm được ${KB.length}`);
    // chip lọc = mỗi nhóm một cái, cộng chip "Tất cả"
    bao(nhom.size + 1 === 52, `52 chip lọc — đếm được ${nhom.size + 1}`);
  }
  /* Cờ đỏ: đếm số thôi thì quá yếu — xoá một luật rồi thêm luật khác vào là đếm
     vẫn khớp. Nên soi VÂN TAY từng luật trong 19 luật gốc. Chỉ cần một luật biến
     mất là build hỏng, kể cả khi tổng số vẫn đúng. */
  const GOC_19 = [
    "Vốn hoá dưới 10.000 tỷ",
    "P/E âm hoặc bằng 0",
    "P/E trên 30",
    "P/B dưới 0,8 với một ngân hàng",
    "P/B dưới 0,7",
    "ROE trên 40%",
    "ROE dưới 5%",
    "CAR dưới 9%",
    "Tỷ lệ nợ xấu trên 3%",
    "Tỷ lệ bao phủ nợ xấu dưới 50%",
    "Bao phủ nợ xấu dưới 80%",
    "Nợ xấu tăng <strong>hai quý liên tiếp</strong>",
    "Nợ xấu tăng so với quý trước",
    "Nợ vay gấp hơn 2 lần vốn chủ",
    "Room ngoại đã gần kín",
    "Giá đã tăng hơn 80% trong 12 tháng",
    "Danh sách ứng viên nâng hạng",
    "Mâu thuẫn trực tiếp",
    "Lợi suất lợi nhuận (1/PE"
  ];
  const mat = GOC_19.filter(s => !app.includes(s));
  bao(mat.length === 0, mat.length
    ? `19 luật cờ đỏ gốc — MẤT ${mat.length}: ${mat.join(" | ")}`
    : "19 luật cờ đỏ gốc còn nguyên vẹn");

  const co = (app.match(/flags\.push/g) || []).length;
  bao(co >= 19, `tổng số luật cờ đỏ — ${co} (19 gốc + ${co - 19} mới của v3)`);
}

/* ---------- v3: chỉ số mới và xếp hạng chéo ---------- */
// Ba chỉ số v3 phải có mặt cả ở ô nhập lẫn ở phần chấm điểm.
bao(/\["fcf",/.test(app) && app.includes("Lợi suất dòng tiền tự do"),
    "v3 · lợi suất dòng tiền tự do");
bao(/\["cfoni",/.test(app) && app.includes("Dòng tiền / Lợi nhuận"),
    "v3 · chất lượng lợi nhuận (dòng tiền trên lợi nhuận)");
bao(/\["nim",/.test(app) && app.includes("co lại hai quý liên tiếp"),
    "v3 · NIM và cờ đỏ NIM co hai quý");
// Biên an toàn phải do JS tính, và mô hình bị cấm tính lại.
bao(app.includes("PHAN_BU_RUI_RO") && app.includes("BIÊN AN TOÀN (đã tính sẵn"),
    "v3 · biên an toàn do JS tính, đưa cho mô hình như dữ kiện");
bao(app.includes("TUYỆT ĐỐI không tính lại"),
    "v3 · prompt cấm mô hình tự tính biên an toàn");
// Cấm mô hình viết số mà lại đưa số cho nó đọc là ra bài không thể giải.
bao(app.includes("CỐ Ý KHÔNG CÓ MỘT CHỮ SỐ NÀO") && /const boSo = s => s/.test(app),
    "v3 · mô tả gửi cho mô hình đã bỏ hết chữ số");
// Xếp hạng chéo BẮT BUỘC dùng chung bộ luật, không được có thang điểm riêng.
bao(app.includes("function scoreScreen(nguon)") && app.includes("const r = scoreScreen(p);"),
    "v3 · bảng xếp hạng dùng chung scoreScreen, không có thang riêng");
bao(app.includes('id="xh-bang"') && app.includes("function renderXepHang"),
    "v3 · có bảng xếp hạng chéo");

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
