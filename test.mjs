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
  // A2 · trợ lý AI nội bộ — hai hàm gác cổng cho chữ do mô hình sinh ra
  "baCau", "hopLeCau",
  // v3 · bộ lọc nâng cấp
  "scoreScreen",
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

/* scoreScreen đọc vài thứ ở phạm vi ngoài (scHas, PHAN_BU_RUI_RO, S.scr khi gọi
   không tham số). Dựng sẵn ở đây để chấm được bộ số bất kỳ mà không cần trình duyệt. */
srcs.push('const scHas = v => v !== null && v !== undefined && isFinite(v);');
const mPB = js.match(/const PHAN_BU_RUI_RO = \d+;/);
if (mPB) srcs.push(mPB[0]); else missing.push("PHAN_BU_RUI_RO");
srcs.push('const S = { scr: {} };');
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
   TRỢ LÝ AI — hai hàng rào cho chữ do mô hình sinh ra
   ============================================================ */
group("baCau — dọn chữ mô hình về ba câu văn xuôi");
t("cắt còn đúng ba câu", ["baCau"], () =>
  eq(F.baCau("Một. Hai. Ba. Bốn. Năm."), "Một. Hai. Ba."));
t("bóc dấu markdown", ["baCau"], () =>
  truthy(!/[*#`]/.test(F.baCau("**Đậm** và `mã` và # tiêu đề. Câu hai. Câu ba.")),
    "không được còn ký tự markdown"));
t("bỏ đánh số đầu dòng", ["baCau"], () =>
  truthy(!/^\s*1\./.test(F.baCau("1. Câu một. Câu hai. Câu ba.")), "còn sót '1.'"));
t("gộp mọi khoảng trắng thành một dòng", ["baCau"], () =>
  truthy(!F.baCau("Câu một.\n\nCâu hai.\nCâu ba.").includes("\n"), "không được còn xuống dòng"));
t("chuỗi rỗng không làm vỡ", ["baCau"], () => { eq(F.baCau(""), ""); eq(F.baCau(null), ""); });

group("hopLeCau — hàng rào chặn mô hình bịa số");
const DAI = "Điểm yếu lớn nhất nằm ở chỗ bảng điểm không nhìn thấy chất lượng tài sản thật. " +
            "Mức định giá rẻ ở đây nhiều khả năng phản ánh nghi ngờ của thị trường. " +
            "Hãy tự hỏi ai đang đứng phía bên kia giao dịch.";
t("đoạn ba câu sạch thì hợp lệ", ["hopLeCau"], () => truthy(F.hopLeCau(DAI), "phải hợp lệ"));
t("có bất kỳ chữ số nào cũng bị loại", ["hopLeCau"], () => {
  truthy(!F.hopLeCau(DAI + " Nợ xấu 3,6 phần trăm."), "chữ số phải bị loại");
  truthy(!F.hopLeCau(DAI.replace("rẻ", "rẻ 0")), "một chữ số cũng đủ để loại");
});
t("chặn đúng ca bịa điểm đã gặp thật", ["hopLeCau"], () =>
  truthy(!F.hopLeCau("Giá trị dựa trên bảng điểm là 4/13 (35%). Câu hai ở đây. Câu ba ở đây nữa."),
    "phải chặn phân số bịa 4/13"));
t("chặn ca chép lại số liệu đã gặp thật", ["hopLeCau"], () =>
  truthy(!F.hopLeCau("Ngân hàng đã có vốn 220.563 tỷ đồng và P/E là 11.95. Câu hai. Câu ba."),
    "phải chặn việc chép số liệu"));
t("quá ngắn thì loại", ["hopLeCau"], () => truthy(!F.hopLeCau("Ngắn quá."), "phải loại"));
t("còn sót markdown thì loại", ["hopLeCau"], () =>
  truthy(!F.hopLeCau("**" + DAI), "phải loại"));
t("chuỗi rỗng thì loại", ["hopLeCau"], () => {
  truthy(!F.hopLeCau(""), "rỗng phải loại"); truthy(!F.hopLeCau(null), "null phải loại");
});

/* ============================================================
   V3 · BỘ LỌC NÂNG CẤP — dòng tiền, NIM, biên an toàn
   ============================================================ */
/* Bộ số nền: doanh nghiệp thường lành mạnh. Từng test chỉ đổi đúng một ô để biết
   chắc thay đổi nào gây ra kết quả nào. */
const CB = (o) => Object.assign({
  ticker: "TEST", sector: "normal", cap: 20000, pe: 12, pb: 1.2, roe: 16,
  de: 0.4, fcf: null, cfoni: null,
  car: null, npl: null, pcr: null, npl1: null, npl2: null,
  nim: null, nim1: null, nim2: null,
  froom: 25, chg12: 10, deposit: 5.5, ftse: false
}, o || {});
const coCo = (r, mau) => r.flags.some(f => f[1].includes(mau));
const timTC = (r, ten) => [...r.V, ...r.M].find(x => x.name === ten);

group("v3 · lợi suất dòng tiền tự do");
t("FCF dương mạnh → 2 điểm", ["scoreScreen"], () =>
  eq(timTC(F.scoreScreen(CB({ fcf: 2000 })), "Lợi suất dòng tiền tự do").pt, 2));
t("FCF âm → 0 điểm và cờ đỏ nặng", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ fcf: -8382 }));
  eq(timTC(r, "Lợi suất dòng tiền tự do").pt, 0);
  truthy(coCo(r, "Dòng tiền tự do âm"), "phải bắn cờ đốt tiền");
});
t("ca HPG thật: P/E 13, ROE 12 vẫn đẹp nhưng FCF âm", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ cap: 186590, pe: 13.05, pb: 1.69, roe: 12.02, fcf: -8382, cfoni: 1.12 }));
  truthy(timTC(r, "P/E").pt >= 1, "P/E vẫn phải được điểm");
  truthy(coCo(r, "Dòng tiền tự do âm"), "nhưng dòng tiền phải bị bắt");
});
t("bỏ trống thì không chấm, không bịa điểm", ["scoreScreen"], () =>
  eq(timTC(F.scoreScreen(CB({})), "Lợi suất dòng tiền tự do").pt, null));

group("v3 · chất lượng lợi nhuận");
t("dòng tiền ≥ lợi nhuận → 2 điểm", ["scoreScreen"], () =>
  eq(timTC(F.scoreScreen(CB({ cfoni: 1.2 })), "Dòng tiền / Lợi nhuận").pt, 2));
t("dưới 0,7 → cờ cảnh báo", ["scoreScreen"], () =>
  truthy(coCo(F.scoreScreen(CB({ cfoni: 0.4 })), "dưới 70% lợi nhuận"), "phải cảnh báo"));
t("dòng tiền âm mà vẫn báo lãi → cờ đỏ nặng", ["scoreScreen"], () =>
  truthy(coCo(F.scoreScreen(CB({ cfoni: -0.5 })), "âm trong khi vẫn báo lãi"), "phải bắn cờ nặng"));

group("v3 · NIM ngân hàng");
const NH = (o) => CB(Object.assign({ sector: "bank", de: null, car: 11, npl: 1.8, pcr: 120 }, o));
t("NIM co hai quý liên tiếp → cờ đỏ nặng", ["scoreScreen"], () =>
  truthy(coCo(F.scoreScreen(NH({ nim: 1.33, nim1: 1.39, nim2: 1.42 })), "co lại hai quý liên tiếp"),
    "đúng bộ số VPB thật, phải bắn cờ"));
t("thứ tự quý bị đảo thì KHÔNG được bắn cờ", ["scoreScreen"], () =>
  truthy(!coCo(F.scoreScreen(NH({ nim: 1.33, nim1: 1.42, nim2: 1.39 })), "co lại hai quý liên tiếp"),
    "đây chính là lỗi sắp cột từng gặp — giữ test để không tái phát"));
t("NIM nở hai quý → cảnh báo nhẹ về chất lượng tăng trưởng", ["scoreScreen"], () =>
  truthy(coCo(F.scoreScreen(NH({ nim: 1.5, nim1: 1.4, nim2: 1.3 })), "nở ra hai quý liên tiếp"), "phải nhắc"));
t("ngân hàng không bị chấm hai ô dòng tiền", ["scoreScreen"], () => {
  const r = F.scoreScreen(NH({ fcf: -9999, cfoni: -2 }));
  truthy(!timTC(r, "Lợi suất dòng tiền tự do"), "ngân hàng không được có ô FCF");
  truthy(!coCo(r, "Dòng tiền tự do âm"), "và không được bắn cờ dòng tiền");
});

group("v3 · biên an toàn");
t("lợi suất cao hơn mức yêu cầu → biên dương", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ pe: 5, deposit: 5 }));   // ey = 20%, yêu cầu = 10%
  approx(r.mos.bien, 50, 0.5);
});
t("đắt → biên âm và bắn cờ", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ pe: 40, deposit: 5.5 }));  // ey = 2,5% << 10,5%
  truthy(r.mos.bien < -100, "phải âm sâu");
  truthy(coCo(r, "Biên an toàn âm sâu"), "phải bắn cờ");
});
t("ưu tiên dòng tiền tự do hơn lợi nhuận kế toán", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ cap: 10000, fcf: 1500, pe: 40 }));  // FCF yield 15% vs ey 2,5%
  eq(r.mos.nguon, "dòng tiền tự do");
  approx(r.mos.loiSuat, 15, 1e-9);
});
t("ngân hàng luôn dùng lợi nhuận kế toán", ["scoreScreen"], () => {
  const r = F.scoreScreen(NH({ pe: 10, fcf: 5000, cap: 10000 }));
  eq(r.mos.nguon, "lợi nhuận kế toán");
});
t("thiếu số thì trả null chứ không đoán", ["scoreScreen"], () =>
  eq(F.scoreScreen(CB({ pe: null })).mos, null));

group("v3 · sửa lỗi chấm điểm FTSE");
t("ô FTSE chỉ còn tối đa 1 điểm", ["scoreScreen"], () =>
  eq(timTC(F.scoreScreen(CB({ ftse: true })), "Ứng viên nâng hạng FTSE").max, 1));
t("không còn chiếm một phần ba luồng động lượng", ["scoreScreen"], () => {
  const r = F.scoreScreen(CB({ ftse: true }));
  truthy(r.m.max === 5, "động lượng tối đa phải là 5 — nhận " + r.m.max);
});

group("v3 · scoreScreen chấm được bộ số bất kỳ (điều kiện của bảng xếp hạng)");
t("hai bộ số khác nhau cho hai kết quả khác nhau", ["scoreScreen"], () => {
  const a = F.scoreScreen(CB({ pe: 6 })), b = F.scoreScreen(CB({ pe: 40 }));
  truthy(a.v.pct > b.v.pct, "mã rẻ phải có điểm giá trị cao hơn");
});
t("19 luật gốc vẫn bắn đúng trong chế độ ngân hàng", ["scoreScreen"], () => {
  const r = F.scoreScreen(NH({ car: 8, npl: 3.6, pcr: 45, npl1: 3.1, npl2: 2.7, froom: 0.3, ftse: true }));
  for (const s of ["CAR dưới 9%", "Tỷ lệ nợ xấu trên 3%", "Tỷ lệ bao phủ nợ xấu dưới 50%",
                   "hai quý liên tiếp", "Room ngoại đã gần kín", "Mâu thuẫn trực tiếp"])
    truthy(coCo(r, s), "mất cờ đỏ gốc: " + s);
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
