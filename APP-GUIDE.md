# LA BÀN TỰ DO TÀI CHÍNH — HƯỚNG DẪN PHÁT TRIỂN
### Tài liệu bàn giao cho Claude Code

---

## 1. TỔNG QUAN

Ứng dụng web **một file HTML tự chứa**, không framework, không npm, không backend —
cộng thêm lớp vỏ PWA để cài được lên Android. Toàn bộ HTML + CSS + JS nằm trong
`app/index.html` (~403 KB: **196 thẻ KB / 51 nhóm**).

| Mục tiêu | Cách hiện thực |
|---|---|
| Học và tra cứu kiến thức | Tab **Cẩm nang** — 196 thẻ, 51 nhóm, tìm kiếm tức thì |
| Biết mình đang ở đâu | Tab **Bản đồ** — 12 bước, 4 giai đoạn, ba nấc cuối tính tự động |
| Biết con số phải đạt | Tab **Con số của tôi** — 5 máy tính trong 5 pane phụ |
| Theo dõi & tự soi | Tab **Theo dõi** — 4 pane phụ: nhật ký · bảy nguồn · tự chấm · suy ngẫm |
| Dữ liệu riêng tư | `localStorage`, không gửi đi đâu; xuất/nhập JSON bằng tay |
| Cài lên điện thoại | PWA: manifest + service worker, chạy được khi mất mạng |

**Năm máy tính trong tab Con số** (thanh chọn phụ `#cnav`): Ba cột mốc · Ngân sách 50/30/20 ·
Bạn đang là ai · Máy tính DCA · Mua hay thuê nhà.

**Bốn pane trong tab Theo dõi** (thanh chọn phụ `#tnav`): Nhật ký · Bảy nguồn thu · Tự chấm · Suy ngẫm.

> Vẫn giữ đúng **5 tab chính** như thiết kế gốc — mọi thứ thêm vào đều nằm trong pane phụ,
> không đẻ thêm tab.

---

## 2. FILE & THƯ MỤC

```
Hành trình tự do tài chính/
├── app/                                  ← BẢN PWA, đây là thứ đưa lên hosting
│   ├── index.html                        ← NGUỒN DUY NHẤT, sửa ở đây
│   ├── manifest.webmanifest
│   ├── sw.js                             ← service worker, NHỚ TĂNG PHIEN_BAN mỗi lần sửa
│   ├── robots.txt                        ← chặn mọi bộ thu thập
│   ├── .nojekyll                         ← GitHub Pages không chạy Jekyll
│   └── icons/  icon-192 · icon-512 · icon-maskable-512 · favicon-32
├── La-Ban-Tu-Do-Tai-Chinh.html           ← SINH TỰ ĐỘNG từ app/index.html, đừng sửa tay
├── build.mjs                             ← kiểm tra + sinh bản một file
├── test.mjs                              ← 39 test công thức tài chính
├── test-pwa.mjs                          ← 21 test PWA, gồm cả tắt mạng
├── shot.mjs                              ← kiểm giao diện + chụp ảnh (thay Playwright)
├── serve.mjs                             ← máy chủ tĩnh để thử PWA ở localhost
├── tao-icon.py                           ← sinh lại icon PNG từ ký hiệu la bàn
├── muathue.py + verify.py                ← mô hình tham chiếu MUA vs THUÊ (Python, 9/9 đạt)
├── Cam-nang-Hanh-trinh-Tu-do-Tai-chinh.md ← 56 chương kiến thức nguồn
├── APP-GUIDE.md                          ← tài liệu này
├── HUONG-DAN-CAI-DAT.md                  ← hướng dẫn deploy + cài Android, viết cho người dùng
├── anh-chup/                             ← ảnh chụp do shot.mjs sinh ra
├── Hieutv/                               ← tài liệu gốc (PDF, xlsx)
└── _luu-tru/                             ← nhánh cũ đã bỏ, giữ để tham chiếu
```

> ⚠️ **Chỉ sửa `app/index.html`.** File ở gốc bị `build.mjs` ghi đè mỗi lần chạy.
> `_luu-tru/app.html` là nhánh cũ hoàn toàn khác (6 tab, khoá `htdtc.v2`, chỉ 164 thẻ) —
> **đừng lấy nhầm**.

**Vòng làm việc mỗi lần sửa:**

```bash
node test.mjs        # công thức tài chính còn đúng không
node build.mjs       # kiểm cú pháp + PWA hợp lệ, rồi sinh bản một file
node shot.mjs        # duyệt hết tab/pane ở 1180px và 360px, chụp ảnh
node test-pwa.mjs    # manifest, service worker, tắt mạng vẫn chạy
```

---

## 3. HỆ THỐNG THIẾT KẾ

### Bảng màu (CSS custom properties)

Định nghĩa 3 lần: `:root` (sáng), `@media (prefers-color-scheme:dark) :root:not([data-theme="light"])`,
và `:root[data-theme="dark"]`. **Mọi màu phải đi qua token** — không đặt màu literal chỉ nằm
trong khối media/`[data-theme]`, nếu không trang sẽ hỏng ở trạng thái "system".

| Token | Sáng | Tối | Vai trò |
|---|---|---|---|
| `--ground` | `#F3F5F7` | `#0F141A` | nền trang |
| `--surface` | `#FFFFFF` | `#171D25` | nền thẻ |
| `--surface-2/3` | `#EAEEF3` / `#E2E8EF` | `#1F2731` / `#27313D` | nền phụ, rãnh meter |
| `--ink` / `--ink2` / `--ink3` | `#12181F` / `#495463` / `#78838F` | `#ECF1F6` / `#A7B3C0` / `#7B8795` | chữ chính/phụ/mờ |
| `--line` / `--line-2` | `#DBE1E8` / `#C8D1DA` | `#293440` / `#35424F` | viền |
| `--accent` / `--accent-2` | `#1F5FA8` / `#2a78d6` | `#5B9BE5` / `#3987e5` | xanh chủ đạo, màu series biểu đồ |
| `--brass` | `#9C6B1F` | `#D9A441` | đồng thau — nhấn phụ, tiến độ |
| `--good` / `--warn` / `--crit` | `#1B8F62` / `#B87D00` / `#C4403F` | `#22A87A` / `#D19A20` / `#E36F6E` | ngữ nghĩa |

**Ý đồ:** xanh mực đo đạc + đồng thau — bảng đồng hồ hàng hải, hợp với ẩn dụ "hành trình"
và "vận tốc thoát" của series. Không dùng gradient tím/xanh, không dùng cream + serif —
những kiểu đã bão hoà.

### Chữ

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@500;600&display=swap">
```

| Vai trò | Font | Dùng ở đâu |
|---|---|---|
| Giao diện + tiêu đề | **Be Vietnam Pro** | mặc định toàn trang |
| Văn xuôi dài | **Source Serif 4** | `.lede`, `.kcard p/ul`, `.note` |
| Số | **IBM Plex Mono** | class `.num`, `.tile .v`, ô input, trục biểu đồ |

Google Fonts là **host font duy nhất** CSP của Artifact cho phép. Luôn khai báo fallback stack.
Số liệu luôn dùng `font-variant-numeric: tabular-nums`.

### Quy ước khác

- Bo góc `--r: 10px`; khoảng cách bằng `gap` của flex/grid, tránh margin rời rạc
- Bảng và biểu đồ nằm trong `.tblwrap { overflow-x:auto }` — body không bao giờ cuộn ngang
- `@media (prefers-reduced-motion:reduce)` tắt mọi transition
- Breakpoint duy nhất: `640px`

---

## 4. MÔ HÌNH DỮ LIỆU

Toàn bộ state nằm trong một key `localStorage`:

```js
const KEY = "htdtc.v1";

{
  steps: { "1": true, "4": true, ... },   // bước nào đã đánh dấu hoàn thành
  open:  6,                               // bước nào đang mở rộng (null = không)
  inp: {
    min: 8,        // chi tiêu tối thiểu    (triệu ₫/tháng)
    std: 15,       // chi tiêu tiêu chuẩn   (triệu ₫/tháng)
    want: 25,      // chi tiêu khi đã tự do (triệu ₫/tháng)
    income: 25,    // thu nhập sau thuế     (triệu ₫/tháng)
    passive: 0,    // thu nhập thụ động     (triệu ₫/tháng)
    ef: 0,         // quỹ khẩn cấp hiện có  (triệu ₫)
    assets: 0,     // tài sản sinh lời      (triệu ₫)
    debt: 0,       // nợ xấu còn lại        (triệu ₫)
    efMonths: 6,   // mục tiêu quỹ khẩn cấp (tháng)
    rate: 6,       // lợi nhuận thực        (%/năm)
    swr: 4         // tỷ lệ rút an toàn     (%/năm)
  },
  log: [ { d:"2026-08", nw:520, pi:3.5 } ],  // nhật ký theo tháng

  // ----- thêm ở bản này, khoá localStorage GIỮ NGUYÊN htdtc.v1 -----
  srcs:    { rental:{on:true, amt:7}, … },   // bảy nguồn thu nhập
  lessons: { "1":true, "3":true },           // mười bài học đầu tư
  ikigai:  { a:"", b:"", c:"", d:"" },       // bốn ô Ikigai
  dca:     { pmt:10, nam:20, rate:10 },      // máy tính DCA
  nha:     { loai:"cc", gia:3000, von:900, nam:25, kyHan:25, thueThang:10,
             soLanChuyen:1, lai:11, tangGia:5, phiThang:1.2, lamPhat:4,
             loiSuat:10, coPhiBaoTri:true,
             phi:{truocBa:0.5, congChung:2.2, phiHoSo:5,
                  phiBaoTri:2, thueTNCN:2, moiGioi:1.5} },
  principles:{ "1":true },                   // chín nguyên tắc chi tiêu
  mistakes:{ kienthuc:true },                // bốn sai lầm (tick = ĐÃ TRÁNH được)
  env:     { banbe:"thuan", noio:"can" },    // tự soi môi trường
  baThu:   { a:"", b:"", c:"" },             // ba thứ quan trọng nhất
  values:  { q1:"", q2:"", q3:"", q4:"" },   // bốn câu hỏi tự soi
  rebuild: { kienThuc:5, kinhNghiem:5, quanHe:5, uyTin:5, nam:5 },
  pains:   [ {id, t:"…", d:"2026-08-29"} ],  // danh sách vấn đề
  tuoi:    0,                                // timeline 18–35
  tuDo:    { so:"", ghi:"" },                // con số nào đủ để BẠN tự do
  tiec:    "",                               // nếu 80 tuổi nhìn lại
  ui:      { cpane:"moc", tpane:"log", saoLuu:"2026-08-29" }
}
```

**Ô nhập mới trong `inp`:** `debtPay` — tổng tiền trả nợ mỗi tháng, dùng cho cảnh báo
tỷ lệ trả nợ / thu nhập vượt 40%.

> **Đơn vị: TRIỆU đồng** cho mọi giá trị tiền. `money()` tự đổi sang "tỷ" khi ≥ 1000.
> Nếu thêm trường mới, luôn giữ đơn vị này để không phải đổi công thức.

**Vì sao vẫn là `htdtc.v1`:** không cần migrate. Hàm `merge()` phủ `DEF` lên dữ liệu đọc vào
và ép kiểu từng nhánh, nên file sao lưu cũ (chỉ có `steps` / `inp` / `log`) vẫn nhập được bình thường —
các nhánh thiếu lấy giá trị của `DEF`.

**Thêm trường mới:** thêm vào `DEF`, rồi thêm đúng một dòng vào `merge()`:
- object phẳng cần giữ mặc định → `ten:{...b.ten, ...obj(p.ten)}`
- object dạng từ điển tự do → `ten:obj(p.ten)`
- mảng → `ten:Array.isArray(p.ten) ? p.ten : []`

Chỉ đổi `KEY` khi **đổi ý nghĩa** của một trường đã tồn tại — lúc đó mới phải viết migrate thật.

---

## 5. BẢN ĐỒ MÃ NGUỒN

Toàn bộ JS nằm trong một IIFE `(() => { ... })()` ở cuối file, chia khối bằng comment banner.

| Khối | Nội dung | Sửa khi nào |
|---|---|---|
| `STAGES` | 4 giai đoạn, mỗi cái chứa mảng số bước | đổi cấu trúc lộ trình |
| `STEPS` | 12 bước: `{n, t, d, acts[], note}` | thêm/sửa việc cần làm, ghi chú |
| `LEVELS` | 4 mức độ tiết kiệm | — |
| `KB` | mảng thẻ cẩm nang | **thêm kiến thức mới ở đây** |
| `KEY / DEF / merge / load / save` | state + persistence | thêm trường dữ liệu |
| `$ / el / num / money / dec / yrs / niceMax` | tiện ích định dạng | — |
| `uid / esc / todayISO / toast` | tiện ích cho các sổ ghi | — |
| `monthsTo / calc` | **toàn bộ công thức tài chính** | đổi mô hình tính |
| `PANELS` + listener `#tabs` | chuyển tab | thêm tab mới |
| `renderMap / stepEl / renderSummary` | tab Bản đồ | |
| `FIELDS_1 / FIELDS_2 / buildFields` | định nghĩa ô nhập | **thêm ô nhập mới ở đây** |
| `tile / renderCalc` | tab Con số | thêm chỉ số |
| `renderTrack / drawChart` | tab Theo dõi + biểu đồ SVG | |
| `renderLevels / renderCows` | 4 mức tiết kiệm + máy tính "nuôi bò" | |
| **`CPANES` + listener `#cnav`** | 5 pane phụ tab Con số | thêm máy tính mới |
| **`TPANES` + listener `#tnav`** | 4 pane phụ tab Theo dõi | thêm mục theo dõi mới |
| **`budget503020 / renderBudget`** | ngân sách 50/30/20 + quỹ 12 tháng | |
| **`phanLoaiSanNong / renderSanNong`** | thợ săn ↔ nông dân, phép thử 3 tháng, bội số nghỉ việc | |
| **`renderRungs`** | ba nấc cuối tính tự động trong tab Bản đồ | |
| **`dca / DCA_FIELDS / renderDCA / drawDCA`** | máy tính DCA + biểu đồ hai đường | |
| **`PHI_VN / pmt / soSanhMuaThue / diemHoaVon`** | **toàn bộ mô hình mua vs thuê** | port từ `muathue.py` |
| **`NHA_LOAI / NHA_F1 / NHA_F2 / NHA_PHI / renderNha`** | giao diện mua vs thuê | thêm ô nhập |
| **`SRC7 / srcStats / renderSrcs`** | bảy nguồn thu nhập | |
| **`LESSONS / LES_GROUPS / renderLessons`** | mười bài học đầu tư | |
| **`IK / IK_CROSS / renderIkigai`** | sơ đồ Ikigai | |
| **`PRINCIPLES / renderPrinciples`** | chín nguyên tắc chi tiêu | |
| **`MISTAKES / renderMistakes`** | bốn sai lầm đầu tư | |
| **`ENV / ENV_MUC / renderEnv`** | tự soi môi trường | |
| **`textGrid`** | dựng lưới ô nhập chữ tự do | dùng lại cho mọi biểu mẫu chữ |
| **`RB_FIELDS / renderRebuild`** | chỉ số gây dựng lại | |
| **`DOI_GD / renderAge`** | timeline 18–35 | |
| **`renderPains`** | danh sách vấn đề | |
| **`renderTuDo`** | con số nào đủ để BẠN tự do | |
| **`ghiNhoSaoLuu / renderNhacSaoLuu`** | nhắc sao lưu định kỳ | |
| `renderKB` | tìm kiếm + lọc cẩm nang | |
| `exp / imp / clr` | xuất nhập dữ liệu | |
| **`renderNumbers`** | mọi thứ phụ thuộc ô nhập số — gọi lại sau mỗi lần gõ | **thêm render phụ thuộc số vào đây** |
| **`renderTuSoi`** | gom các render của pane Tự chấm và Suy ngẫm | |
| `renderAll` | gọi tất cả — **thêm hàm render mới vào đây** | |

> `buildFields(host, defs)` giờ dùng chung cho nhiều nhóm ô nhập. Ô nhập của DCA và Mua/Thuê
> có bộ dựng riêng (`buildDcaFields`, `buildNhaFields`) vì chúng ghi vào `S.dca` / `S.nha`
> chứ không vào `S.inp`.

---

## 6. CÔNG THỨC TÀI CHÍNH

Nằm gọn trong `calc()`. Tất cả dựa trên **quy tắc 4%** (Bengen, 1994) → nhân 25.

```js
const swr  = p.swr / 100;          // mặc định 0.04
const fiSec = p.min  * 12 / swr;   // An toàn tài chính
const fiInd = p.std  * 12 / swr;   // Độc lập tài chính  ← "vận tốc thoát"
const fiFre = p.want * 12 / swr;   // Tự do tài chính

const savings = p.income - p.std;              // để dành mỗi tháng
const srate   = savings / p.income;            // tỷ lệ tiết kiệm
const net     = p.assets - p.debt;             // vốn khởi điểm
const efTarget = p.min * p.efMonths;           // mục tiêu quỹ khẩn cấp
const cover    = p.passive / p.std;            // tỷ lệ bao phủ thụ động
```

**Số tháng còn lại** — lãi kép theo tháng, đóng góp đều đầu kỳ:

```js
function monthsTo(target, principal, monthly, annualRate) {
  if (principal >= target) return 0;
  const i = Math.pow(1 + annualRate, 1/12) - 1;     // lãi tháng tương đương
  if (i <= 0) return monthly > 0 ? (target - principal) / monthly : Infinity;
  const den = principal * i + monthly;
  const nu  = target    * i + monthly;
  if (den <= 0) return Infinity;
  return Math.log(nu / den) / Math.log(1 + i);
}
```

**Máy tính "nuôi bò"** (`renderCows`): với `per` = thu nhập mỗi nguồn/tháng —
`cần cho mức tối thiểu = ceil(min/per)`, `cần cho mức tiêu chuẩn = ceil(std/per)`,
`nuôi dư an toàn = ceil(needStd × 1.5)`, `đang có = passive / per`.

### Máy tính DCA — `dca(pmt, nam, ratePct, swrPct)`

Niên kim cuối kỳ với lãi tháng tương đương:

```js
const i  = Math.pow(1 + r, 1/12) - 1;      // r = tỷ suất/năm dạng thập phân
const FV = i === 0 ? pmt*n : pmt*(Math.pow(1+i, n) - 1)/i;   // n = số tháng
```

Bộ số kiểm chứng (đã có trong `test.mjs`): **10 tr/th × 20 năm × 10%/năm** → chỉ tích luỹ
**2.400 triệu**, có đầu tư **7.182,6 triệu**, quy tắc 4% cho **23,9 triệu/tháng**.
Thêm 10 năm nữa → **20.628 triệu**.

### Mua vs thuê nhà — `soSanhMuaThue` / `diemHoaVon`

Port nguyên logic từ `muathue.py`. **Nguyên tắc so sánh, đây là chỗ dễ làm sai nhất:**
hai bên bỏ ra **cùng một ngân sách mỗi tháng**; ai chi ít hơn thì phần dư vào danh mục đầu tư
và ăn lãi kép. Cả hai khởi đầu với cùng số tiền mặt. Chạy vòng lặp **theo từng tháng** vì tiền
thuê tăng theo lạm phát trong khi khoản trả nợ đứng yên.

```js
const nganSach = Math.max(rT, chiMuaT);        // bên nào chi nhiều hơn thì đó là ngân sách chung
dmThue = dmThue*(1 + iDt) + (nganSach - rT);
dmMua  = dmMua *(1 + iDt) + (nganSach - chiMuaT);
```

> ❌ **Đừng làm theo bảng tính gốc của hieu.tv** — nó lấy giá trị cuối kỳ trừ tổng chi phí danh nghĩa,
> tức cộng dồn tiền thuê và tiền trả nợ theo giá trị danh nghĩa nhưng lại tính lãi kép cho vốn đầu tư.
> Hai bên bị đối xử khác nhau và sai số lên tới hàng chục tỷ.

**Hai quy ước lãi suất khác nhau, cố ý:**
- `pmt()` dùng lãi **danh nghĩa chia 12** (`r/12`) — đúng cách ngân hàng báo lãi vay.
- Danh mục đầu tư dùng lãi **tháng tương đương** (`(1+r)^(1/12) − 1`) — đúng cách lãi kép hoạt động.

Điểm hoà vốn tìm bằng **dò nhị phân 80 vòng** trên khoảng `[-5%, +40%]` của mức tăng giá nhà.

**Bộ số kiểm chứng** (nhà 3.000, vốn 900, 25 năm, lãi vay 11%, lạm phát 4%, đầu tư 10%,
thuê 10 tr/th, chung cư +5%/năm, có phí bảo trì, ở yên một chỗ):

| | |
|---|---|
| Trả nợ mỗi tháng | 20,6 triệu |
| Chi phí lúc mua | 82,2 triệu |
| Giá nhà sau 25 năm | 10,16 tỷ |
| Net worth khi MUA | 9,85 tỷ |
| Net worth khi THUÊ | 21,05 tỷ |
| Điểm hoà vốn | 8,2%/năm |

Bảng độ nhạy (lãi vay × lợi suất đầu tư → điểm hoà vốn) cũng được kiểm từng ô trong `test.mjs`.

**Hai phép kiểm chứng bắt buộc — chúng bắt gần như mọi lỗi port:**
1. Bỏ hết thuế phí, đặt mức tăng giá đúng bằng lợi suất đầu tư, không vay, không thuê →
   hai bên phải bằng nhau đến từng số lẻ.
2. Đặt mức tăng giá = điểm hoà vốn vừa tìm được → chênh lệch hai bên ≈ 0.

### Ngân sách 50/30/20 — `budget503020(income, coDinhThuc)`

Bản của hieu.tv, **không phải** bản 50/30/20 phổ biến của Mỹ: 50% chi phí cố định · 30% đầu tư ·
20% hưởng thụ · quỹ dự phòng = **12 tháng** chi phí cố định thực tế. Cờ `vuot` bật khi chi phí
cố định thật vượt 50% thu nhập.

### Thợ săn ↔ nông dân — `phanLoaiSanNong(cover)`

Theo `cover = thu nhập thụ động ÷ chi tiêu tiêu chuẩn`:
`< 0,2` thợ săn · `0,2–1` nông dân ngắn ngày · `≥ 1` nông dân dài ngày.

**Cạm bẫy đã sửa:**
- `yrs()` phải làm tròn **tổng số tháng trước** rồi mới chia, nếu không sẽ ra "19 năm 12 th".
- Số lẻ hiển thị phải qua `dec()` (dấu phẩy kiểu Việt) — **trừ** giá trị đưa vào `style="width:…%"`,
  chỗ đó bắt buộc dấu chấm, nếu không thanh meter câm.
- `.acts li` là `display:flex`, nên `<strong>`/`<em>` bên trong `<li>` sẽ thành flex item riêng và
  vỡ bố cục. Nội dung có thẻ inline phải bọc trong một `<span>`.

---

## 7. BIỂU ĐỒ

SVG viết tay, không thư viện. Trong `drawChart()`.

- Một series duy nhất → **không cần legend**, tiêu đề đã nói rõ
- Nét 2px, điểm ≥8px, điểm cuối được nhấn (bán kính lớn hơn + tô đặc)
- Nền vùng bằng `linearGradient` mờ dần
- Lưới mờ dùng `--line`; nhãn trục dùng `--ink3`
- **Trục y làm tròn đẹp** bằng `niceMax()` (1 / 2 / 2.5 / 5 / 10 × 10ⁿ)
- Ba đường đứt nét là 3 cột mốc; **chỉ vẽ khi ≤ 2.6× giá trị lớn nhất**, nếu không thì
  hiện chú thích trung thực "cột mốc gần nhất vẫn nằm ngoài khung"
- Có lớp hover: crosshair + tooltip, vùng bắt sự kiện `<rect>` rộng 28px
- Có nút **"Xem dạng bảng"** cho khả năng tiếp cận

Nếu thêm biểu đồ mới: dùng slot màu categorical theo thứ tự cố định
(`#2a78d6` sáng / `#3987e5` tối cho series 1), không tự sinh màu mới.

---

## 8. THÊM NỘI DUNG

### Thêm một thẻ cẩm nang

```js
{
  g: "Đầu tư",                      // tên nhóm — trùng tên có sẵn thì gộp vào nhóm đó
  t: "Tiêu đề thẻ",
  b: ["Đoạn 1 (cho phép HTML: <strong> <em>)", "Đoạn 2"],
  l: ["Gạch đầu dòng 1", "Gạch đầu dòng 2"],   // tuỳ chọn
  b2: ["Đoạn sau danh sách"]                    // tuỳ chọn
}
```

Nhóm mới tự động sinh chip lọc. Tìm kiếm quét cả `t`, `g`, `b`, `l`, `b2` sau khi bóc thẻ HTML.

### Thêm một ô nhập

Thêm vào `FIELDS_1` hoặc `FIELDS_2`: `["khoá", "Nhãn", "gợi ý ngắn", "đơn vị"]`,
và thêm giá trị mặc định vào `DEF.inp`. `buildFields()` lo phần còn lại.

### Thêm một máy tính vào tab Con số

1. Thêm `<button data-c="ten">` vào `nav#cnav`
2. Thêm `<div class="cpane" id="c-ten">` (không có class `on` — chỉ pane mặc định mới có)
3. Thêm `ten:"#c-ten"` vào object `CPANES`
4. Viết `renderTen()`, gọi trong `renderNumbers()` nếu nó phụ thuộc ô nhập số

### Thêm một mục vào tab Theo dõi

Y hệt như trên nhưng với `#tnav`, `.tpane`, `TPANES`, và gọi trong `renderTuSoi()`.

### Thêm một checklist tự chấm

Mẫu có sẵn ở `PRINCIPLES` + `renderPrinciples()`: một mảng `{n, t, d}`, dựng bằng
`.chklist` / `.chk.plain`, trạng thái lưu ở `S.<ten>[key] = true`. Nhớ bọc ô tick trong
`<label class="box">` để có vùng bấm 44×44.

### Thêm một biểu mẫu chữ tự do

Dùng `textGrid("#id", DEFS, S.kho)` với `DEFS = [{k, t, q}]`. Nó lo cả việc đọc/ghi
`localStorage`. Mẫu: `BA_THU`, `VAL_Q`, `IK`.

### Thêm một tab chính

1. Thêm `<button data-t="ten"><span class="full">Tên dài</span><span class="short">Ngắn</span></button>`
   vào `nav.tabs` — **phải có cả hai span**, thanh tab dưới đáy trên điện thoại dùng nhãn ngắn
2. Thêm `<section class="panel" id="p-ten" hidden>`
3. Thêm `ten: "#p-ten"` vào object `PANELS`
4. Sửa `grid-template-columns:repeat(5,1fr)` của `nav.tabs` trong media query 640px
5. Viết `renderTen()` và gọi trong `renderAll()`

---

## 9. KIỂM THỬ

Playwright **không** cài trên máy này. Thay vào đó `shot.mjs` và `test-pwa.mjs` lái thẳng
Chrome đã có sẵn qua **DevTools Protocol**, dùng `WebSocket` và `fetch` có sẵn trong Node 22+.
Không dependency, không npm.

### `node test.mjs` — 39 test công thức

Trích **thẳng thân hàm** ra khỏi `app/index.html` bằng cách đếm ngoặc nhọn rồi chạy trong
`node:vm`. Không chép lại công thức, nên test luôn kiểm đúng bản đang chạy.

- `grab(ten)` cắt `function ten(...)`, `grabConst(TEN)` cắt `const TEN = {...}`
- Thêm hàm mới cần test → thêm tên vào mảng `NAMES`; hàm phải khai báo dạng `function ten(...)`
- Hàm chưa tồn tại thì test tự **bỏ qua** thay vì hỏng — viết test trước, code sau vẫn chạy được

### `node build.mjs` — kiểm tính toàn vẹn rồi sinh bản một file

Kiểm cú pháp JS · đủ file PWA · manifest hợp lệ · có icon maskable · service worker có
chuỗi phiên bản và có dọn cache cũ · mọi file trong `SHELL` tồn tại thật. Hỏng bất cứ mục nào
thì **không sinh file**.

### `node shot.mjs` — giao diện, hai kích thước màn hình

Ở **1180px** và **360px**: duyệt hết 5 tab và toàn bộ pane phụ, kiểm
`scrollWidth > clientWidth` ở từng chỗ, đếm thẻ cẩm nang, thử tìm kiếm và lọc nhóm, bắt
`Runtime.exceptionThrown`, kiểm `localStorage` còn dữ liệu sau reload, in ra bảng số liệu để
đối chiếu bằng mắt, rồi chụp ảnh sáng/tối vào `anh-chup/`.

- `shot()` chụp **toàn trang**, `shotVP()` chụp **chỉ khung nhìn** — cần cái sau mới thấy
  thanh tab cố định dưới đáy
- `node shot.mjs --url=http://localhost:8080/` để kiểm bản đang chạy trên hosting

### `node test-pwa.mjs` — 21 test PWA

Tự bật `serve.mjs`, lái Chrome ở viewport điện thoại: manifest tải được và đủ trường ·
mọi icon tải được thật · service worker đăng ký và activated · cache đã có file ·
**tắt mạng bằng `Network.emulateNetworkConditions` rồi reload** → trang vẫn tải, vẫn đủ 5 tab,
vẫn đủ 196 thẻ, `localStorage` vẫn ghi được.

### Checklist mỗi lần sửa

```
□ node test.mjs      → 39 đạt · 0 hỏng
□ node build.mjs     → mọi mục ✓
□ node shot.mjs      → KẾT QUẢ: sạch
□ node test-pwa.mjs  → PWA: sạch
□ Nhìn vài ảnh trong anh-chup/ — máy không bắt được lỗi thẩm mỹ
□ Nếu sửa app/index.html: TĂNG PHIEN_BAN trong app/sw.js
```

---

## 10. PWA & HOSTING

Hướng dẫn thao tác cụ thể nằm ở **`HUONG-DAN-CAI-DAT.md`** (viết cho người dùng).
Mục này chỉ ghi phần kỹ thuật cần biết khi sửa.

### Ba file làm nên PWA

| File | Vai trò | Cạm bẫy |
|---|---|---|
| `manifest.webmanifest` | tên, icon, màu, `display:standalone` | `start_url` và `scope` phải là `"./"` — đường dẫn tuyệt đối sẽ hỏng khi đặt trong thư mục con của GitHub Pages |
| `sw.js` | cache-first cho app shell | **`PHIEN_BAN` phải tăng mỗi lần sửa app**, nếu không điện thoại giữ mãi bản cũ |
| `icons/` | 192 · 512 · maskable 512 · favicon 32 | icon maskable phải chừa **vòng an toàn 80%**, Android cắt theo hình launcher |

Sinh lại icon: `python tao-icon.py`. Màu lấy đúng từ design token, vẽ quá cỡ 4× rồi thu nhỏ
để có viền mượt.

### Service worker — những chỗ đã tính trước

- Chỉ đăng ký khi `https:` hoặc `localhost` → mở bằng `file://` không đăng ký, bản một file
  ở thư mục gốc vẫn chạy bình thường
- Toàn bộ thao tác cache bọc `try/catch`; `install` nạp **lẻ từng file** thay vì `addAll`
  để một file lỗi không làm hỏng cả lượt cài
- `activate` xoá mọi cache tên `la-ban-*` không thuộc phiên bản hiện tại
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) được cache riêng → offline vẫn đúng chữ
- Điều hướng trang trả `index.html` từ cache rồi làm mới ngầm cho lần mở sau
- Khi có bản mới, trang hiện `toast()` nhắc đóng hẳn app rồi mở lại

### Tối ưu cảm ứng — những chỗ đã làm

- `viewport-fit=cover` + `env(safe-area-inset-*)` cho máy có tai thỏ và thanh điều hướng
- Mọi thứ bấm được **tối thiểu 44×44**. Ô tick trong lộ trình giữ nguyên kích thước hình vẽ 23px
  nhưng mở rộng vùng bấm bằng `.tick::after{inset:-11px}`
- `-webkit-tap-highlight-color:transparent` và khối `@media (hover:none)` gỡ hiệu ứng hover dính
- Mọi ô nhập số có `inputmode="decimal"` để Android bật bàn phím số
- **≤640px: thanh tab chuyển xuống đáy màn hình** kiểu app di động, dùng nhãn ngắn
  (`.tabs .short`), `main` chừa `padding-bottom` cho nó

> ⚠️ **Cạm bẫy đã mất công tìm ra:** `backdrop-filter` trên một tổ tiên sẽ tạo *containing block*
> cho con `position:fixed`. `header.top` có `backdrop-filter:blur()`, nên thanh tab `fixed` bị neo
> vào header thay vì vào viewport. Media query 640px phải tắt `backdrop-filter` của header thì
> thanh tab mới xuống đáy được.

### Riêng tư khi đặt trên hosting công khai

App không có backend, không analytics, không đăng nhập — số liệu nằm hoàn toàn trong
`localStorage` của máy người dùng. Trang web chỉ chứa mã nguồn. Ba lớp giảm rủi ro đã có sẵn:
`<meta name="robots" content="noindex, nofollow">`, `app/robots.txt` chặn toàn bộ, và
khuyến nghị đặt tên repo khó đoán.

Muốn khoá hẳn bằng mật khẩu thì phải đổi sang **Cloudflare Pages + Cloudflare Access**
(miễn phí tới 50 người) — dùng lại nguyên thư mục `app/`, không sửa code.

---

## 11. VIỆC CÒN LẠI

### Nội dung

- [ ] Lấy nốt **5 video** còn thiếu của playlist *Hành trình tự do tài chính*:
  `cri-olhOOrM` (Làm công lãnh lương có đến được tự do tài chính?),
  `6Snew5np1tE` (Những sự thật hiển nhiên về tiền),
  `Ea8qJsQXHlI` (2 loại tài sản nên tích luỹ trong năm 2023),
  `J2-no9gQhzg`, `HBkZgvMe2EE`
- [ ] Playlist **"Các bài giảng chuyên môn"** và các playlist khác trên `@hieu-tv`
- [ ] Bổ sung phần **lạm phát** và **lãi suất kép** (có video riêng trên kênh)
- [ ] Ghi nguồn từng thẻ cẩm nang (tập nào) để tra ngược

### Đã làm xong ở chặng này

**Ưu tiên cao (A1):**
- [x] Máy tính **ngân sách 50/30/20** + quỹ dự phòng 12 tháng, cảnh báo chi phí cố định vượt 50%
- [x] **Checklist 7 nguồn thu nhập** + tỷ lệ chủ động/thụ động + ẩn dụ vườn cây
- [x] Phân loại **thợ săn / nông dân** + phép thử ba tháng
- [x] **Chỉ số bội số nghỉ việc** với hai mốc 1,0× và 2,0×
- [x] **Máy tính DCA** — hai đường trên một biểu đồ, nối sang quy tắc 4%, kèm backtest thật 2022
- [x] **Máy tính MUA vs THUÊ** — port đúng `muathue.py`, điểm hoà vốn, bảng độ nhạy, 6 cảnh báo
- [x] **Biểu mẫu Ikigai** — 4 ô tự do + 4 vùng giao
- [x] **Ba nấc cuối tính tự động** trong tab Bản đồ + nhãn "bốn giai đoạn đo bốn thứ khác nhau"
- [x] **Checklist 10 bài học đầu tư** chia 3 nhóm

**Ưu tiên trung bình (A2):**
- [x] Cảnh báo **tỷ lệ trả nợ / thu nhập vượt 40%**
- [x] Ô nhập **"3 thứ quan trọng nhất với bạn"**
- [x] **Checklist 9 nguyên tắc chi tiêu**
- [x] **Checklist tự soi môi trường** — bạn bè / đồng nghiệp / nơi ở / bạn đời
- [x] **Chỉ số gây dựng lại** — 4 yếu tố + số năm
- [x] **Checklist 4 sai lầm đầu tư** + **4 câu hỏi tự soi về giá trị**
- [x] **Danh sách vấn đề** (pain point journal)
- [x] Câu hỏi **"con số nào đủ để bạn TỰ DO?"** đặt cạnh con số 25×
- [x] **Timeline 18–35** — nhập tuổi, vị trí trên cả hai sơ đồ
- [x] Ô nhập **"nếu 80 tuổi nhìn lại"** cạnh bội số nghỉ việc

**PWA & kỹ thuật:**
- [x] Tách thành `app/` với manifest, service worker, 4 icon; cài được lên Android
- [x] Tối ưu cảm ứng: thanh tab dưới đáy, safe-area, 44×44, `inputmode`, gỡ hover dính
- [x] Xuất file sao lưu **tải thật được trên Chrome Android** (blob download), kèm nhắc sao lưu 30 ngày
- [x] Bộ kiểm thử tự động thay Playwright: `test.mjs` · `shot.mjs` · `test-pwa.mjs` · `build.mjs`
- [x] Sinh icon bằng `tao-icon.py`

### Còn lại

**Nội dung**
- [ ] Ghi nguồn từng thẻ cẩm nang (tập nào / tài liệu nào) để tra ngược
- [ ] Các playlist khác trên `@hieu-tv`

**Tính năng — từ backlog cũ, vẫn chưa làm**
- [ ] **Nhật ký chi tiêu** theo đúng phương pháp Bước 4: nhập nhanh tên · ngày · số tiền rồi
      phân ba nhóm Must-have / Nice-to-have / Waste, tự tính ra mức tối thiểu và tiêu chuẩn
      thay vì bắt người dùng tự ước lượng. *Đây là thứ đáng làm nhất còn lại.*
- [ ] **Bảng trả nợ** — nhập từng khoản, xếp ưu tiên theo lãi suất, sinh lộ trình theo tháng.
      Ô `inp.debtPay` đã có sẵn để nối vào.
- [ ] **Bốn tài khoản** — waterfall Emergency → Sinking → Investment
- [ ] **Sổ nguồn thu nhập thụ động** — từng "con bò": tên, vốn, dòng tiền, trạng thái;
      nối vào checklist 7 nguồn đã có
- [ ] Biểu đồ **tỷ lệ bao phủ theo thời gian** (thụ động ÷ chi tiêu), dữ liệu đã có trong `log[].pi`
- [ ] **Chế độ in / xuất PDF** cho phần cẩm nang
- [ ] **Nhắc định kỳ** hằng tháng nhập số liệu (Notification API, cần xin quyền)

**Kỹ thuật**
- [ ] Tách `KB` và `STEPS` ra file JSON riêng, dựng `index.html` bằng script — dễ sửa nội dung hơn.
      *Cân nhắc kỹ: nó phá vỡ tính "một file tự chứa" của bản ở thư mục gốc.*
- [ ] Cân nhắc **Cloudflare Pages + Access** nếu muốn khoá trang bằng mật khẩu
- [ ] Đóng gói APK bằng Bubblewrap — xem mục 7 của `HUONG-DAN-CAI-DAT.md`

---

## 12. NGUYÊN TẮC KHI SỬA

1. **Một file, không framework, không npm.** `build.mjs` chỉ kiểm tra rồi sao chép — nó không
   biên dịch gì cả, gỡ nó ra thì app vẫn chạy. Giá trị lớn nhất của app này là mở phát chạy ngay,
   offline cũng được.
2. **Không đưa dữ liệu tài chính cá nhân ra khỏi máy người dùng.** Không analytics,
   không capability lưu state chung.
3. **Mọi màu qua token**, mọi số tiền qua `money()`, mọi số lẻ qua `dec()`, mọi khoảng thời gian
   qua `yrs()`. Sửa công thức thì chạy `node test.mjs` trước khi build.
4. **Trung thực về giới hạn.** Quy tắc 4% là quy ước, không phải bảo đảm. Máy tính mua/thuê
   không mô phỏng kịch bản giá nhà giảm. DCA giả định tỷ suất không đổi. **Giữ nguyên toàn bộ
   các khối cảnh báo đã có** — đặc biệt sáu điều ở cuối máy tính mua/thuê, thiếu chúng thì con số
   sẽ bị dùng sai. App không đưa ra lời khuyên đầu tư hay lời khuyên bất động sản.
5. **Ghi nguồn.** Nội dung là đúc kết từ series của Hieu Nguyen (HIEU.TV) — giữ phần
   ghi nguồn ở footer, và luôn viết lại bằng lời của mình chứ không chép nguyên văn.


---

## NHẬT KÝ NỘI DUNG

| Chặng | Nhóm KB được thêm |
|---|---|
| 1–2 | Nền tảng, Giai đoạn I, Nợ, Theo dõi chi tiêu, Dòng tiền, Trước khi đầu tư, Đầu tư, Thu nhập thụ động, Đích đến, Hiểu lầm, Lời dặn, Làm công ăn lương, Tự chủ tài chính, Sự thật hiển nhiên, Vốn & Kiến thức, Lạm phát, Lãi suất kép, Nguyên tắc chi tiêu |
| 3 | Bản chất của tiền, Rủi ro & Lợi nhuận, Nông dân & Thợ săn, Tiền lương, Kiếm tiền hiệu quả, Giá trị của tự do, Bảo hiểm xã hội, Sai lầm khi đầu tư, Bài học thực chiến |
| 4 | Khi nào nên đầu tư, Khung phân tích thị trường, Sẵn sàng để giàu, Thẻ ngân hàng, Giàu có vs Thịnh vượng, Dấn thân |
| 5 | **Hai bí quyết** (2), **Môi trường** (3), **7 nguồn thu nhập** (2), **Blockchain & tiền ảo** (5), **Mua nhà** (3), **Tiêu tiền** (7 — trọn bộ 3 tập) |
| 6 | **Ba góc nhìn** (3), **Đầu tư thụ động & DCA** (2), **Tiền bạc trong tình yêu** (3) |
| 7 | *(từ 10 tài liệu trong `Hieutv/`, không phải video)* — **12 bước tự do tài chính** (3), **Hai lối sống** (3), **Ikigai** (2), **10 bài học đầu tư** (3), **Mua hay thuê nhà** (4), **Hối tiếc & quyết định lớn** (2), **Ảo tưởng năng lực** (3), **Đồ sưu tầm** (2), **Ai định nghĩa thành công** (2) |

Cẩm nang markdown đã đồng bộ: **56 chương** — chương XX trở đi sinh tự động từ mảng `KB`.
Công cụ: **196 thẻ / 51 nhóm**.

### Quy trình đồng bộ cẩm nang ↔ app
1. Thêm thẻ mới vào mảng `KB` trong `app/index.html` (chèn trước `\n];`).
2. **Tên nhóm (`g`) phải dùng ký tự thật, KHÔNG dùng HTML entity.** Dùng `&`, không dùng `&amp;`.
   Lý do thật sự **không phải** ở khâu hiển thị — `el()` dùng `innerHTML` nên chip vẫn hiện đúng — mà ở
   khâu **so khớp chuỗi**: `gen2.py` đối chiếu `k['g']` với bảng `ORDER` bằng `==`, nên `"A &amp; B"`
   không khớp `"A & B"` và **chương bị thiếu trong im lặng**, không báo lỗi. Bộ lọc theo nhóm trong JS
   cũng so chuỗi thô như vậy. *(Đã dính lỗi này ở chặng 5 và suýt dính lại ở chặng 7.)*
3. Kiểm tra cú pháp: tách khối `<script>` ra file rồi `node --check`.
4. Sinh lại chương XX+ từ chính mảng `KB` bằng `/tmp/gen2.py` — trích `KB` ra JSON bằng `node`, chuyển
   `<strong>`→`**`, `<em>`→`*`, giải mã entity, xoá thẻ còn lại, xuống dòng ở ~98 ký tự. Script thay
   thế **toàn bộ** phần từ `## XX.` tới footer và **dựng lại mục lục**, nên hai bản không bao giờ lệch.
   Chương I–XIX viết tay giữ nguyên. Thẻ mới thêm vào nhóm *đã* có chương viết tay thì liệt kê tên
   trong `EXTRA_TITLES` để rơi vào chương "Bổ sung" ở cuối. Số La Mã sinh bằng hàm, không hard-code.
5. `node build.mjs` — kiểm cú pháp, kiểm PWA, rồi sinh lại `La-Ban-Tu-Do-Tai-Chinh.html`.
6. `node shot.mjs` — nó tự đếm thẻ và chips (phải ra **196/52**, kể cả chip "Tất cả"), thử tìm kiếm
   và lọc nhóm, duyệt hết tab/pane ở hai kích thước màn hình, bắt `pageerror`.
   **Kiểm bằng mắt phần chip: không được lẫn HTML entity.**
7. Tăng `PHIEN_BAN` trong `app/sw.js`, rồi `git push` để GitHub Pages dựng lại.

### Số tham chiếu — dùng làm gợi ý mặc định hoặc chú thích

- Mốc tự do tài chính ở thành phố lớn VN: **~10–15 tỷ**
- Vốn khởi điểm để bắt đầu đầu tư: **10–20 triệu** (nước ngoài: vài trăm đô)
- Hiệu suất 20 năm tại VN (Dragon Capital 2021): cổ phiếu 15,9% · BĐS 11,9% · vàng 9% · tiết kiệm 8% · USD 2,2%
- Lãi nợ thẻ tín dụng: **3–5%/tháng**
- Lãi vay mua nhà VN: **6–9% ưu đãi 6–18 tháng, rồi thả nổi 11–15%** — phải tính bằng lãi thả nổi
- Thuế/phí BĐS VN: lệ phí trước bạ **0,5%** (NĐ 10/2022) · thuế TNCN chuyển nhượng **2% giá bán**
  (TT 111/2013 sửa đổi bởi TT 92/2015) · phí bảo trì chung cư **2%** đóng một lần · môi giới 1–2%
- Điểm hoà vốn mua/thuê (nhà 3 tỷ, vốn 900tr, 25 năm, thuê 10tr/th, lạm phát 4%, đầu tư 10%/năm):
  lãi vay 7% → **6,5%/năm** · 9% → **7,4%** · 11% → **8,2%** · 13% → **9,0%**
- Knight Frank Luxury Investment Index 10 năm tới Q2/2019: cả rổ **+146% (9,4%/năm)** · whisky +540%
  (20,4%) · xe cổ +190% · tranh +146% · đồ nội thất **−30%**. *Không tính phí giao dịch và lưu trữ*
- Dunning–Kruger 1999: nhóm tứ phân vị thấp nhất thật ra ở **phân vị 12**, tự cho mình ở **phân vị 62**
- Backtest thật ở VN, kịch bản xấu nhất (vào đúng đỉnh 1/2022): DCA 10tr/th trong 30 tháng →
  vốn 300tr → giá trị **~337tr** (~5%/năm). Cùng lúc đó bỏ một cục 1 tỷ đang lỗ **~200tr**.
  *Đây là lý lẽ mạnh nhất cho DCA — đã hiển thị trong pane Máy tính DCA.*
- Tỷ suất tham chiếu: thụ động dài hạn **7–10%/năm** là đủ đi đường dài; đội ngũ chuyên nghiệp
  hướng tới 20–30% và không phải lúc nào cũng đạt. Lời hứa 100%/năm là báo động đỏ.
- Ô *lợi nhuận kỳ vọng* trong tab Con số mặc định **6%** (thực, đã trừ lạm phát); ô *tỷ suất kỳ vọng*
  của máy tính DCA mặc định **10%** (danh nghĩa). Hai ô khác nhau, cố ý.
