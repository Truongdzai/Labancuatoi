/* Kiểm thử công thức tài chính — không framework, không dependency.
   Trích thẳng thân hàm ra khỏi La-Ban-Tu-Do-Tai-Chinh.html rồi chạy trong node:vm,
   nên test luôn kiểm đúng đoạn mã đang chạy thật, không bao giờ lệch pha.

   Chạy:  node test.mjs
*/
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const SRC = existsSync("app/index.html") ? "app/index.html" : "La-Ban-Tu-Do-Tai-Chinh.html";
const html = readFileSync(SRC, "utf8");
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

/* cắt một khai báo `function ten(` bằng cách đếm ngoặc nhọn; null nếu chưa có */
function grab(name) {
  const i = js.indexOf("function " + name + "(");
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < js.length; j++) {
    if (js[j] === "{") { d++; started = true; }
    else if (js[j] === "}") { d--; if (started && d === 0) return js.slice(i, j + 1); }
  }
  return null;
}

/* cắt một khai báo `const TEN = { ... };` — các bảng tham số dùng chung */
function grabConst(name) {
  const i = js.indexOf("const " + name + " = {");
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < js.length; j++) {
    if (js[j] === "{") { d++; started = true; }
    else if (js[j] === "}") { d--; if (started && d === 0) return js.slice(i, j + 1) + ";"; }
  }
  return null;
}
const CONSTS = ["PHI_VN"];

const NAMES = [
  // đã có sẵn trong app
  "monthsTo", "yrs", "money", "niceMax",
  // A1-5 · DCA
  "dca", "laiKep",
  // A1-6 · mua vs thuê
  "pmt", "soSanhMuaThue", "diemHoaVon",
  // A1-1 · ngân sách 50/30/20
  "budget503020",
  // A1-3 · thợ săn / nông dân
  "phanLoaiSanNong"
];

const ctx = vm.createContext({});
const missing = [];
const srcs = ["const num = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };"];
for (const c of CONSTS) {
  const s = grabConst(c);
  if (s) srcs.push(s); else missing.push(c);
}
for (const n of NAMES) {
  const s = grab(n);
  if (s) srcs.push(s); else missing.push(n);
}
vm.runInContext(srcs.join("\n"), ctx);
const F = {};
for (const n of NAMES) if (!missing.includes(n)) F[n] = vm.runInContext(n, ctx);

let pass = 0, fail = 0, skip = 0;
function group(t) { console.log("\n" + t); }
function t(name, deps, fn) {
  const lack = deps.filter(d => missing.includes(d));
  if (lack.length) { skip++; console.log("  bỏ   " + name + "  (chưa có " + lack.join(", ") + ")"); return; }
  try { fn(); pass++; console.log("  ok   " + name); }
  catch (e) { fail++; console.log("  HỎNG " + name + "\n       " + e.message); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
function eq(a, b, m) { if (a !== b) throw new Error((m || "") + ` — nhận ${JSON.stringify(a)}, cần ${JSON.stringify(b)}`); }
function approx(a, b, eps, m) { if (!near(a, b, eps)) throw new Error((m || "") + ` — nhận ${a}, cần ~${b}`); }
function truthy(v, m) { if (!v) throw new Error(m || "phải đúng"); }

/* ============================================================
   ĐÃ CÓ SẴN — chống hồi quy
   ============================================================ */
group("monthsTo — lãi kép theo tháng, góp đều");
t("đủ vốn rồi thì 0 tháng", ["monthsTo"], () => eq(F.monthsTo(100, 100, 5, 0.06), 0));
t("lãi 0% chỉ là phép chia", ["monthsTo"], () => approx(F.monthsTo(120, 0, 10, 0), 12, 1e-9));
t("không góp, không lãi → vô hạn", ["monthsTo"], () => eq(F.monthsTo(100, 0, 0, 0), Infinity));
t("chỉ nhờ lãi kép: 100 → 200 @6%/năm", ["monthsTo"], () =>
  approx(F.monthsTo(200, 100, 0, 0.06), Math.log(2) / Math.log(Math.pow(1.06, 1 / 12)), 1e-6));
t("có lãi nhanh hơn không lãi", ["monthsTo"], () =>
  truthy(F.monthsTo(1000, 0, 10, 0.08) < F.monthsTo(1000, 0, 10, 0)));

group("yrs — làm tròn tổng số tháng TRƯỚC khi chia");
t("11,6 tháng → 1 năm", ["yrs"], () => eq(F.yrs(11.6), "1 năm"));
t("235 tháng → 19 năm 7 th", ["yrs"], () => eq(F.yrs(235), "19 năm 7 th"));
t("0 → đã đạt · ∞ → không tới được", ["yrs"], () => {
  eq(F.yrs(0), "đã đạt"); eq(F.yrs(Infinity), "không tới được");
});

group("money — đổi sang tỷ khi ≥ 1000 triệu");
t("999 tr giữ đơn vị tr", ["money"], () => truthy(F.money(999).endsWith("tr"), F.money(999)));
t("1000 tr thành tỷ", ["money"], () => truthy(F.money(1000).endsWith("tỷ"), F.money(1000)));

group("niceMax — trục y tròn số");
t("0→1 · 87→100 · 1200→2000 · 2,3→2,5", ["niceMax"], () => {
  eq(F.niceMax(0), 1); eq(F.niceMax(87), 100); eq(F.niceMax(1200), 2000);
  approx(F.niceMax(2.3), 2.5, 1e-9);
});
t("luôn ≥ giá trị vào", ["niceMax"], () => {
  for (const v of [1, 7, 42, 333, 9999, 0.4]) truthy(F.niceMax(v) >= v, "thua ở " + v);
});

/* ============================================================
   A1-5 · MÁY TÍNH DCA
   bộ số đã kiểm chứng: 10tr/th × 20 năm × 10%/năm
   ============================================================ */
group("dca — trung bình cộng giá mua");
t("chỉ tích luỹ = 10 × 12 × 20 = 2.400 triệu", ["dca"], () =>
  approx(F.dca(10, 20, 10).tichLuy, 2400, 1e-9));
t("có đầu tư ≈ 7.182,6 triệu (≈7,1 tỷ)", ["dca"], () =>
  approx(F.dca(10, 20, 10).dauTu, 7182.6, 1));
t("quy tắc 4% → ≈ 23,9 triệu/tháng", ["dca"], () =>
  approx(F.dca(10, 20, 10).thuNhap4pc, 23.94, 0.05));
t("thêm 10 năm nữa → hơn 20 tỷ", ["dca"], () =>
  truthy(F.dca(10, 30, 10).dauTu > 20000, "30 năm phải > 20.000 triệu"));
t("lãi 0% thì đầu tư = tích luỹ", ["dca"], () => {
  const r = F.dca(10, 20, 0); approx(r.dauTu, r.tichLuy, 1e-6);
});
t("đầu tư luôn ≥ tích luỹ khi lãi dương", ["dca"], () => {
  for (const y of [1, 5, 10, 30]) truthy(F.dca(5, y, 8).dauTu >= F.dca(5, y, 8).tichLuy, "sai ở " + y);
});

/* ============================================================
   LÃI KÉP — tab "Lộ trình Lãi kép", có thêm vốn ban đầu
   ============================================================ */
group("laiKep — vốn ban đầu + góp đều");
t("vốn ban đầu = 0 thì trùng khít dca()", ["laiKep", "dca"], () => {
  for (const [pmt, nam, r] of [[10, 20, 10], [5, 30, 8], [3, 7, 12]]) {
    approx(F.laiKep(0, pmt, r, nam).tong, F.dca(pmt, nam, r).dauTu, 1e-9);
    approx(F.laiKep(0, pmt, r, nam).goc,  F.dca(pmt, nam, r).tichLuy, 1e-9);
  }
});
t("vốn gốc = von + pmt × 12 × năm", ["laiKep"], () =>
  approx(F.laiKep(500, 10, 10, 20).goc, 500 + 2400, 1e-9));
t("vốn ban đầu 500tr, 20 năm, 10%/năm → riêng phần vốn thành 500 × 1,1^20", ["laiKep"], () =>
  approx(F.laiKep(500, 0, 10, 20).tong, 500 * Math.pow(1.1, 20), 1e-6));
t("lãi 0% thì tổng = gốc", ["laiKep"], () => {
  const r = F.laiKep(300, 10, 0, 15); approx(r.tong, r.goc, 1e-6);
});
t("chuỗi theo năm khớp với kết quả cuối kỳ", ["laiKep"], () => {
  const r = F.laiKep(200, 8, 9, 12);
  const cuoi = r.series[r.series.length - 1];
  eq(cuoi.y, 12, "năm cuối");
  approx(cuoi.tong, r.tong, 1e-6);
  approx(cuoi.goc, r.goc, 1e-6);
});
t("chuỗi tăng đều, tổng luôn ≥ gốc khi lãi dương", ["laiKep"], () => {
  const r = F.laiKep(100, 5, 10, 25);
  for (let i = 1; i < r.series.length; i++) {
    truthy(r.series[i].tong >= r.series[i - 1].tong, "tổng phải tăng ở năm " + i);
    truthy(r.series[i].tong >= r.series[i].goc, "tổng < gốc ở năm " + i);
  }
});
t("namVuot là năm đầu tiên lãi vượt gốc, và đúng theo chuỗi", ["laiKep"], () => {
  const r = F.laiKep(0, 10, 10, 40);
  truthy(r.namVuot !== null, "40 năm ở 10%/năm thì lãi phải vượt gốc");
  const p = r.series[r.namVuot], truoc = r.series[r.namVuot - 1];
  truthy(p.tong - p.goc > p.goc, "năm vượt phải thoả điều kiện");
  truthy(truoc.tong - truoc.goc <= truoc.goc, "năm liền trước thì chưa được thoả");
});
t("chặng quá ngắn thì chưa có năm vượt", ["laiKep"], () =>
  eq(F.laiKep(0, 10, 8, 5).namVuot, null));
t("số âm bị kẹp về 0, không sinh NaN", ["laiKep"], () => {
  const r = F.laiKep(-100, -5, 10, 10);
  eq(r.von, 0); eq(r.pmt, 0); approx(r.tong, 0, 1e-9); approx(r.goc, 0, 1e-9);
  truthy(isFinite(r.boi) && isFinite(r.pcLai), "boi/pcLai không được NaN");
});

/* ============================================================
   A1-6 · MUA vs THUÊ — port từ muathue.py / verify.py
   ============================================================ */
const P = () => ({
  gia: 3000, von: 900, nam: 25, kyHan: 25, lai: 11, lamPhat: 4, loiSuat: 10,
  tangGia: 5, phiThang: 1.2, coPhiBaoTri: true, thueThang: 10, soLanChuyen: 1
});

group("pmt — trả nợ đều hằng tháng (lãi danh nghĩa /12)");
t("đối chiếu bảng gốc: 400.000 @3,13%/30 năm × 360 = 617.253", ["pmt"], () =>
  approx(F.pmt(400000, 0.0313, 30) * 360, 617253, 1.5));

group("soSanhMuaThue — bộ số mặc định VN (nhà 3 tỷ, vốn 900, 25 năm)");
t("trả nợ mỗi tháng = 20,6 triệu", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).traNoThang, 20.6, 0.05));
t("chi phí lúc mua = 82,2 triệu", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).chiPhiMua, 82.2, 0.05));
t("giá nhà sau 25 năm = 10,16 tỷ", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).giaCuoi, 10159.1, 2));
t("net worth khi MUA = 9,85 tỷ", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).nwMua, 9850, 10));
t("net worth khi THUÊ = 21,05 tỷ", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).nwThue, 21050, 10));
t("tổng tiền thuê 25 năm (10tr, +4%/năm) = 4.997,5 triệu", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(P()).tongThueNha, 4997.509, 0.01));
t("chuyển nhà 3 lần tệ hơn ở yên", ["soSanhMuaThue"], () =>
  truthy(F.soSanhMuaThue({ ...P(), soLanChuyen: 3 }).nwMua < F.soSanhMuaThue(P()).nwMua));
t("lãi vay 13% xấu hơn 7%", ["soSanhMuaThue"], () =>
  truthy(F.soSanhMuaThue({ ...P(), lai: 13 }).chenh < F.soSanhMuaThue({ ...P(), lai: 7 }).chenh));

group("soSanhMuaThue — hai phép kiểm chứng bắt buộc");
const TRUNG_TINH = {
  gia: 1000, von: 1000, nam: 10, kyHan: 10, lai: 0, lamPhat: 0, loiSuat: 10,
  tangGia: 10, phiThang: 0, coPhiBaoTri: false, thueThang: 0, soLanChuyen: 1,
  phi: { truocBa: 0, congChung: 0, phiHoSo: 0, phiBaoTri: 0, thueTNCN: 0, moiGioi: 0 }
};
t("bỏ hết phí, nhà tăng = lợi suất, không vay, không thuê → MUA == THUÊ", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(TRUNG_TINH).chenh, 0, 1e-9));
t("  ... và cả hai = 1000 × 1,1^10 = 2593,74", ["soSanhMuaThue"], () =>
  approx(F.soSanhMuaThue(TRUNG_TINH).nwMua, 1000 * Math.pow(1.1, 10), 1e-9));
t("nhà +14% > đầu tư 10% → mua thắng; +6% → thuê thắng", ["soSanhMuaThue"], () => {
  truthy(F.soSanhMuaThue({ ...TRUNG_TINH, tangGia: 14 }).chenh > 0, "+14% phải thắng");
  truthy(F.soSanhMuaThue({ ...TRUNG_TINH, tangGia: 6 }).chenh < 0, "+6% phải thua");
});

group("diemHoaVon — dò nhị phân trên mức tăng giá nhà");
t("bộ số mặc định → 8,2%/năm", ["diemHoaVon"], () =>
  approx(F.diemHoaVon(P()), 8.25, 0.06));
t("đặt tăng giá = điểm hoà vốn → chênh lệch ≈ 0", ["diemHoaVon", "soSanhMuaThue"], () => {
  const d = F.diemHoaVon(P());
  approx(F.soSanhMuaThue({ ...P(), tangGia: d }).chenh, 0, 1e-3);
});
t("bảng độ nhạy khớp từng ô (lãi vay × lợi suất)", ["diemHoaVon"], () => {
  const want = {
    "7": { "8": 4.5, "10": 6.5, "12": 8.4 },
    "9": { "8": 5.6, "10": 7.4, "12": 9.3 },
    "11": { "8": 6.5, "10": 8.2, "12": 10.0 },
    "13": { "8": 7.3, "10": 9.0, "12": 10.7 }
  };
  for (const lai of [7, 9, 11, 13]) for (const ls of [8, 10, 12]) {
    const got = F.diemHoaVon({ ...P(), lai, loiSuat: ls });
    approx(Math.round(got * 10) / 10, want[lai][ls], 0.06, `lãi ${lai}% × đầu tư ${ls}%`);
  }
});

/* ============================================================
   A1-1 · NGÂN SÁCH 50/30/20  (bản hieu.tv)
   ============================================================ */
group("budget503020 — 50% cố định · 30% đầu tư · 20% hưởng thụ");
t("thu nhập 20tr → 10 / 6 / 4 và quỹ dự phòng 120tr", ["budget503020"], () => {
  const b = F.budget503020(20, 10);
  approx(b.coDinh, 10, 1e-9, "cố định"); approx(b.dauTu, 6, 1e-9, "đầu tư");
  approx(b.huongThu, 4, 1e-9, "hưởng thụ"); approx(b.quyDuPhong, 120, 1e-9, "quỹ 12 tháng");
});
t("chi phí cố định thật vượt 50% thì bật cảnh báo", ["budget503020"], () => {
  truthy(F.budget503020(20, 13).vuot === true, "13/20 = 65% phải cảnh báo");
  truthy(F.budget503020(20, 9).vuot === false, "9/20 = 45% không cảnh báo");
});
t("thu nhập 0 không sinh NaN", ["budget503020"], () => {
  const b = F.budget503020(0, 0);
  for (const k of ["coDinh", "dauTu", "huongThu", "quyDuPhong"]) truthy(isFinite(b[k]), k + " phải hữu hạn");
});

/* ============================================================
   A1-3 · THỢ SĂN / NÔNG DÂN
   ============================================================ */
group("phanLoaiSanNong — theo tỷ lệ thụ động ÷ chi tiêu");
t("0% → thợ săn", ["phanLoaiSanNong"], () => eq(F.phanLoaiSanNong(0).id, "san"));
t("≥100% → nông dân dài ngày", ["phanLoaiSanNong"], () => eq(F.phanLoaiSanNong(1.2).id, "dai"));
t("ở giữa → nông dân ngắn ngày", ["phanLoaiSanNong"], () => eq(F.phanLoaiSanNong(0.5).id, "ngan"));

/* ============================================================ */
console.log(`\n${pass} đạt · ${fail} hỏng · ${skip} bỏ qua (chưa code)`);
if (missing.length) console.log("Chưa có trong app: " + missing.join(", "));
process.exit(fail ? 1 : 0);
