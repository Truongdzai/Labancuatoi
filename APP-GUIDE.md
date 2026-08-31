# LA BÀN TỰ DO TÀI CHÍNH — HƯỚNG DẪN PHÁT TRIỂN
### Tài liệu bàn giao cho Claude Code

---


---

## ⚠ ĐỌC TRƯỚC — SỬA FILE NÀO

**`app/index.html` là NGUỒN DUY NHẤT.** Mọi thay đổi code phải vào file đó.

`La-Ban-Tu-Do-Tai-Chinh.html` ở thư mục gốc là **file sinh ra**, `node build.mjs` ghi đè nó
mỗi lần chạy. Sửa vào đó thì công sức biến mất lặng lẽ ở lần build kế tiếp — **đã xảy ra
thật một lần** khi thêm tab Bộ lọc: toàn bộ thay đổi đi vào file sinh ra, trong khi bản
deploy lên GitHub Pages đọc từ `app/index.html` nên không hề nhận được gì.

**Quy trình chuẩn mỗi lần sửa code:**

```
1. sửa app/index.html
2. nếu đổi giao diện/tính năng → bump PHIEN_BAN trong app/sw.js
   (không bump thì điện thoại đã cài PWA vẫn phục vụ bản cache cũ)
3. node build.mjs     # kiểm tra + sinh lại bản một-file
4. node test.mjs      # 39 phép kiểm công thức
5. git add -A && git commit && git push
```

**Dấu hiệu bạn đang sửa nhầm file:** `git status` hiện `M La-Ban-Tu-Do-Tai-Chinh.html`
mà **không** hiện `M app/index.html`.

## 1. TỔNG QUAN

Ứng dụng web **một file duy nhất**, không build step, không dependency, không backend.
Toàn bộ HTML + CSS + JS nằm trong `app.html` (~214 KB: **172 thẻ KB / 43 nhóm**).

| Mục tiêu | Cách hiện thực |
|---|---|
| Học và tra cứu kiến thức | Tab **Cẩm nang** — 54 thẻ, 12 nhóm, tìm kiếm tức thì |
| Biết mình đang ở đâu | Tab **Bản đồ** — 12 bước, checklist, vòng tiến độ |
| Biết con số phải đạt | Tab **Con số của tôi** — 3 cột mốc theo quy tắc 4% |
| Theo dõi tiến triển | Tab **Theo dõi** — nhật ký tài sản ròng + biểu đồ |
| Dữ liệu riêng tư | `localStorage`, không gửi đi đâu; có xuất/nhập JSON |

---

## 2. FILE & THƯ MỤC

```
/root/htdtc/
├── app.html                              ← NGUỒN CHÍNH (nội dung artifact, không có <html>/<head>/<body>)
├── standalone.html                       ← sinh ra tự động: app.html + khung doctype đầy đủ
├── La-Ban-Tu-Do-Tai-Chinh.html           ← bản giao cho người dùng (copy của standalone)
├── Cam-nang-Hanh-trinh-Tu-do-Tai-chinh.md ← cẩm nang markdown 13 chương
├── shot.py / shot2.py                    ← script Playwright chụp màn hình kiểm thử
├── extract.py                            ← parse tool-result JSON lấy transcript
├── docs/
│   ├── METHOD-thu-thap-phu-de.md         ← quy trình lấy phụ đề
│   └── APP-GUIDE.md                      ← tài liệu này
└── tx/                                   ← transcript thô (nếu giữ)
```

> ⚠️ **Quan trọng:** `app.html` là *nội dung* artifact — **không** chứa `<!doctype>`, `<html>`,
> `<head>`, `<body>`. Công cụ Artifact tự bọc khung khi xuất bản. Bản `standalone.html`
> mới có khung đầy đủ, dùng để mở offline.

**Lệnh sinh standalone:**

```python
c = open('app.html', encoding='utf-8').read()
open('standalone.html','w',encoding='utf-8').write(
  '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  '<style>*{margin:0;padding:0}</style>\n</head><body>\n' + c + '\n</body></html>')
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
  log: [ { d:"2026-08", nw:520, pi:3.5 } ]  // nhật ký theo tháng
}
```

> **Đơn vị: TRIỆU đồng** cho mọi giá trị tiền. `money()` tự đổi sang "tỷ" khi ≥ 1000.
> Nếu thêm trường mới, luôn giữ đơn vị này để không phải đổi công thức.

**Nâng cấp schema:** khi đổi cấu trúc, đổi `KEY` thành `htdtc.v2` và viết hàm migrate
từ `v1`, đừng phá dữ liệu người dùng. Hàm `load()` đã merge với `DEF` nên thêm trường mới
vào `DEF.inp` là tự động an toàn.

---

## 5. BẢN ĐỒ MÃ NGUỒN

Toàn bộ JS nằm trong một IIFE `(() => { ... })()` ở cuối file, chia khối bằng comment banner.

| Khối | Nội dung | Sửa khi nào |
|---|---|---|
| `STAGES` | 4 giai đoạn, mỗi cái chứa mảng số bước | đổi cấu trúc lộ trình |
| `STEPS` | 12 bước: `{n, t, d, acts[], note}` | thêm/sửa việc cần làm, ghi chú |
| `LEVELS` | 4 mức độ tiết kiệm | — |
| `KB` | mảng thẻ cẩm nang | **thêm kiến thức mới ở đây** |
| `KEY / DEF / load / save` | state + persistence | thêm trường dữ liệu |
| `$ / el / num / money / yrs / niceMax` | tiện ích | — |
| `monthsTo / calc` | **toàn bộ công thức tài chính** | đổi mô hình tính |
| `PANELS` + listener `#tabs` | chuyển tab | thêm tab mới |
| `renderMap / stepEl / renderSummary` | tab Bản đồ | |
| `FIELDS_1 / FIELDS_2 / buildFields` | định nghĩa ô nhập | **thêm ô nhập mới ở đây** |
| `tile / renderCalc` | tab Con số | thêm chỉ số |
| `renderTrack / drawChart` | tab Theo dõi + biểu đồ SVG | |
| `renderLevels / renderCows` | 4 mức tiết kiệm + máy tính "nuôi bò" | |
| `renderKB` | tìm kiếm + lọc cẩm nang | |
| `exp / imp / clr` | xuất nhập dữ liệu | |
| `renderAll` | gọi tất cả — **thêm hàm render mới vào đây** | |

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

**Cạm bẫy đã sửa:** `yrs()` phải làm tròn **tổng số tháng trước** rồi mới chia,
nếu không sẽ ra "19 năm 12 th".

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

### Thêm một tab

1. Thêm `<button data-t="ten">` vào `nav.tabs`
2. Thêm `<section class="panel" id="p-ten" hidden>`
3. Thêm `ten: "#p-ten"` vào object `PANELS`
4. Viết `renderTen()` và gọi trong `renderAll()`

---

## 9. VÒNG LẶP KIỂM THỬ

Chromium có sẵn trong container. **Luôn render và nhìn trước khi xuất bản.**

```python
from playwright.sync_api import sync_playwright
import pathlib
url = "file://" + str(pathlib.Path("standalone.html").resolve())
with sync_playwright() as p:
    b  = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    pg = b.new_page(viewport={"width":1180,"height":1000})
    pg.goto(url); pg.wait_for_timeout(900)
    # bơm dữ liệu mẫu qua input event rồi reload
    ...
    pg.screenshot(path="s_map.png")
    print("overflow:", pg.evaluate(
      "document.documentElement.scrollWidth > document.documentElement.clientWidth"))
    b.close()
```

**Checklist mỗi lần sửa:**

```
□ node --check trên phần <script> (tách bằng regex)
□ Chụp cả 5 tab
□ Chụp chế độ tối: documentElement.setAttribute('data-theme','dark')
□ Chụp viewport 390px, kiểm tra không tràn ngang
□ Đọc console errors (bỏ qua lỗi Google Fonts — container chặn mạng)
```

Tách JS để kiểm tra cú pháp:

```python
import re
c = open('app.html', encoding='utf-8').read()
open('/tmp/app.js','w',encoding='utf-8').write(
    re.search(r'<script>(.*)</script>', c, re.S).group(1))
# rồi: node --check /tmp/app.js
```

---

## 10. XUẤT BẢN

```
Artifact(file_path="/root/htdtc/app.html", favicon="🧭",
         description="...", label="v3-...")
```

- URL hiện tại: `https://claude.ai/code/artifact/bdf1b91d-dd30-4433-88db-12356f194c63`
- **Xuất bản lại cùng đường dẫn file = giữ nguyên URL.** Từ hội thoại khác thì phải
  truyền `url=` để cập nhật đúng artifact.
- Favicon giữ nguyên 🧭 — người dùng nhận ra tab bằng icon.
- Tiêu đề nằm trong thẻ `<title>` ở đầu file, giữ ổn định.

**Về `capabilities`:** hiện **không khai báo gì**. Cân nhắc đã đưa ra:

- ❌ Không dùng capability `artifact` (lưu phiên bản mới của chính trang) — vì nó sẽ nhúng
  **số liệu tài chính cá nhân vào HTML đã xuất bản**, đi theo trang nếu người dùng chia sẻ.
- ✅ Dùng `localStorage` — riêng tư tuyệt đối, chỉ nằm trên máy người dùng.
- ⚠️ **Việc cần làm:** mã nguồn đã gọi `claude.use("downloads")` cho nút xuất file sao lưu
  (kèm phương án dự phòng là ô textarea để chép tay), **nhưng lần xuất bản gần nhất chưa
  truyền `capabilities: {downloads: true}`**. Lần xuất bản tới phải thêm tham số đó, nếu
  không nút xuất file sẽ luôn rơi vào nhánh dự phòng.

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

### Tính năng

- [ ] **Nhật ký chi tiêu** — hiện thực đúng phương pháp Bước 4: nhập nhanh
      (tên · ngày · số tiền) rồi phân 3 nhóm Must-have / Nice-to-have / Waste,
      tự tính ra mức tối thiểu và tiêu chuẩn thay vì bắt người dùng tự nhập
- [ ] **Bảng trả nợ** — nhập từng khoản (số tiền, lãi suất), tự xếp thứ tự ưu tiên
      theo lãi suất cao nhất và sinh lộ trình trả theo tháng *(đây là thứ tạo ra
      giá trị tâm lý lớn nhất theo đúng tinh thần Phần 4)*
- [ ] **Bốn tài khoản** — công cụ chia dòng tiền, tính số tiền tự động chuyển mỗi tháng
      và mô phỏng waterfall Emergency → Sinking → Investment
- [ ] **Sổ nguồn thu nhập thụ động** — quản lý từng "con bò": tên, vốn, dòng tiền/tháng,
      trạng thái; nối vào máy tính hiện có
- [ ] Biểu đồ **tỷ lệ bao phủ theo thời gian** (thụ động / chi tiêu)
- [ ] **Chế độ in / xuất PDF** cho phần cẩm nang
- [ ] **Nhắc định kỳ** hằng tháng nhập số liệu (dùng scheduled task)

### Kỹ thuật

- [ ] Tách `KB` và `STEPS` ra file JSON riêng, dựng `app.html` bằng script — dễ sửa nội dung hơn
- [ ] Viết test nhỏ cho `monthsTo()` và `calc()` (Node, không cần framework)
- [ ] Migrate schema `v1 → v2` khi thêm nhật ký chi tiêu

---

## 12. NGUYÊN TẮC KHI SỬA

1. **Một file, không build step.** Đừng thêm bundler hay framework — giá trị lớn nhất của
   app này là mở phát chạy ngay, offline cũng được.
2. **Không đưa dữ liệu tài chính cá nhân ra khỏi máy người dùng.** Không analytics,
   không capability lưu state chung.
3. **Mọi màu qua token**, mọi số qua `money()`, mọi khoảng thời gian qua `yrs()`.
4. **Trung thực về giới hạn.** Quy tắc 4% là quy ước, không phải bảo đảm — giữ nguyên
   các dòng cảnh báo đã có.
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

### Tab Bộ lọc (`#p-screen`) — đã làm

Tab thứ 3 trong thanh nav. Chấm một mã cổ phiếu theo số liệu người dùng tự nhập.

**Nguyên tắc thiết kế quan trọng nhất — đừng phá:**

> Công cụ chấm **hai điểm số tách riêng** và **không bao giờ cộng chúng lại**.
> Một điểm tổng duy nhất sẽ che mất chính thông tin có giá trị nhất: khi nào hai tín hiệu
> đang mâu thuẫn với nhau. Nếu sau này có ai đề nghị "gộp lại cho gọn" thì đó là đề nghị
> phá bỏ toàn bộ lý do tồn tại của tính năng này.

**State:** `S.scr` trong `localStorage` key `htdtc.v1`
`{ticker, cap, pe, pb, roe, de, froom, chg12, deposit, ftse}`.
Ô để trống lưu là `null` (không phải `0`) — dùng `scNum()` và `scHas()`, **không dùng
`num()`** vì `num("")` trả về `0` và sẽ bị chấm điểm nhầm.

**Thang điểm** — mỗi tiêu chí 0/1/2, ô chưa nhập không tính vào cả tử số lẫn mẫu số:

| Luồng | Tiêu chí | 2 điểm | 1 điểm | 0 điểm |
|---|---|---|---|---|
| Giá trị | Vốn hoá | ≥ 10.000 tỷ | 5.000–10.000 | < 5.000 |
| Giá trị | P/E | 0 < PE ≤ 12 | 12–18 | ≤ 0 hoặc > 18 |
| Giá trị | P/B | 0,7–1,5 | < 0,7 hoặc 1,5–3 | > 3 |
| Giá trị | ROE | ≥ 15% | 10–15% | < 10% |
| Giá trị | Nợ vay/Vốn chủ | ≤ 0,5 | 0,5–1,0 | > 1,0 |
| Động lượng | Room ngoại còn lại | > 20% | 5–20% | < 5% |
| Động lượng | Đà giá 12 tháng | > +30% | 0 đến +30% | < 0 |
| Động lượng | Ứng viên FTSE | Có | — | Không |

*P/B dưới 0,7 cố ý cho **1 điểm chứ không phải 2** — rẻ bất thường là tín hiệu mơ hồ, không
phải tín hiệu tốt.*

**Bộ phát hiện mâu thuẫn** (`SCR_VERDICT`) — chia bốn góc tại ngưỡng 60%:

| Giá trị | Động lượng | Kết luận |
|---|---|---|
| cao | cao | Nghi ngờ dữ liệu — P/E nhiều khả năng là trailing trong khi giá đã chạy trước |
| **thấp** | **cao** | **MÂU THUẪN — mua đà chứ không mua giá trị. Và đừng DCA vào giao dịch có ngày hết hạn** |
| cao | thấp | Hình dạng cơ hội giá trị *và* hình dạng bẫy giá trị — không phân biệt được từ bên trong |
| thấp | thấp | Không có tín hiệu đủ mạnh |

**Cờ đỏ cứng** (luôn hiện, độc lập với điểm): P/E ≤ 0 · P/E > 30 · P/B < 0,7 · ROE > 40%
· ROE < 5% · Nợ/Vốn chủ > 2 · vốn hoá < 10.000 tỷ · room ngoại ≈ 0 · đà 12 tháng > +80% ·
lợi suất lợi nhuận (1/PE) thấp hơn lãi tiết kiệm · FTSE bật mà room ngoại < 5%
(mâu thuẫn trực tiếp).

**Chế độ ngành (`S.scr.sector`)** — `"normal"` | `"bank"`, đổi bằng nút phân đoạn `#sc-sector`.

Ba nhóm trường: `SCR_V` (luôn có: vốn hoá, P/E, P/B, ROE) · `SCR_SEC[sector]` (thay nhau,
**không bao giờ hiện cùng lúc**) · `SCR_TREND` (chỉ chế độ ngân hàng, **không chấm điểm**,
chỉ dùng cho cờ xu hướng). `applySector()` dựng lại `#scf-sec` và ẩn/hiện `#scf-trendwrap`.

| | Doanh nghiệp thường | Ngân hàng |
|---|---|---|
| Điểm tối đa luồng giá trị | **10** | **14** |
| Đòn bẩy | Nợ vay / Vốn chủ | **CAR** — thay thế hoàn toàn |
| Thêm | — | **Nợ xấu (NPL)**, **Bao phủ nợ xấu (PCR)** |
| Nhập thêm không chấm điểm | — | NPL quý trước, NPL 2 quý trước |

**Vì sao gỡ D/E ở chế độ ngân hàng:** tiền gửi khách hàng là nguồn vốn kinh doanh của ngân
hàng. Mọi ngân hàng đều có tỷ lệ 5–10 lần, nên tiêu chí này đánh trượt toàn bộ ngành —
nó không phân biệt được gì. Đây là lỗi phát hiện được khi chạy thử VPB.

**Thang điểm chế độ ngân hàng:**

| Tiêu chí | 2 điểm | 1 điểm | 0 điểm |
|---|---|---|---|
| CAR | > 12% | 9–12% | < 9% |
| Nợ xấu | < 2% | 2–3% | > 3% |
| Bao phủ nợ xấu | > 100% | 50–100% | < 50% |
| **P/B (ngân hàng)** | **1,0–1,4** | 0,8–1,0 hoặc 1,4–2,0 | < 0,8 hoặc > 2,0 |

*P/B ngân hàng khác hẳn doanh nghiệp thường: dưới 0,8 cho **0 điểm chứ không phải 1**, vì
với ngân hàng, giá dưới giá trị sổ sách thường phản ánh nghi ngờ về chất lượng sổ cho vay
chứ không phải món hời.*

**Cờ đỏ riêng của chế độ ngân hàng** (nâng tổng lên 16): CAR < 9% · nợ xấu > 3% ·
bao phủ < 50% · bao phủ 50–80% (cảnh báo nhẹ) · P/B < 0,8 · **nợ xấu tăng hai quý liên tiếp**.

**Cách implement cờ "nợ xấu tăng nhanh hơn tăng trưởng tín dụng":**
tỷ lệ nợ xấu = nợ xấu ÷ dư nợ, nên *tỷ lệ tăng* **tương đương chính xác** với *nợ xấu tăng
nhanh hơn dư nợ*. Không cần nhập tăng trưởng tín dụng riêng — chỉ cần chuỗi
`npl2 < npl1 < npl` là đủ và đúng về mặt toán học. Tăng một quý thì ra cảnh báo nhẹ, hai
quý liên tiếp mới lên `crit`.

**Bộ số đã kiểm chứng để làm test:**

| Đầu vào | Kỳ vọng |
|---|---|
| cap 250000 · PE 9,5 · PB 1,2 · ROE 18 · D/E 0,4 · room 25 · đà +12 · FTSE tắt | Giá trị **10/10** · Động lượng **3/6** · lợi suất **10,5%** · kết luận *bẫy giá trị* |
| cap 250000 · PE 32 · PB 4,5 · ROE 7 · D/E 2,4 · room 25 · đà +95 · FTSE bật | Giá trị **2/10** · Động lượng **6/6** · **5 cảnh báo** · kết luận *MÂU THUẪN* |

**Bộ test chế độ ngân hàng** (`/tmp/vbank.py`, 9 nhóm, tất cả đạt): mặc định đúng chế độ ·
đổi chế độ thì D/E biến mất và CAR/NPL/PCR hiện · ngân hàng lành mạnh ra 14/14 ·
thang P/B chạy đúng ở 6 mốc (0,75→0 · 0,9→1 · 1,0→2 · 1,4→2 · 1,6→1 · 2,4→0) ·
chuỗi nợ xấu 2,6→3,0→3,4 bật cờ `crit`, còn 3,9→3,6→3,4 thì không · quay lại chế độ thường
ra 10/10 và bảng không còn dòng CAR · chế độ sống sót qua reload · 196 thẻ và 52 chip nguyên vẹn.

*Lưu ý cho người viết test sau này:* các ô giữ nguyên giá trị khi đổi tiêu chí, nên khi
kiểm tra một tiêu chí đơn lẻ phải tính cả điểm của những ô còn sót lại từ bài test trước —
bài test đầu tiên của mục này sai đúng vì lý do đó.

Đã verify ở 1180px và 360px, không tràn ngang, không `pageerror`, dữ liệu sống sót qua
reload. Nguồn lấy số cho từng ô: xem `NGUON-SO-LIEU.md`.

### Quy trình đồng bộ cẩm nang ↔ app
1. Thêm thẻ mới vào mảng `KB` trong `app.html` (chèn trước `\n];`).
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
5. Dựng lại `standalone.html` / `La-Ban-Tu-Do-Tai-Chinh.html` bằng cách bọc `app.html` trong khung
   `<!doctype html>` (artifact tự bọc nên `app.html` không chứa khung này).
6. Verify bằng Playwright: đếm chips + số thẻ, **kiểm tra chip không lẫn HTML entity**, thử vài từ khoá
   mới, click thử nhóm mới, duyệt hết các tab, kiểm tra tràn ngang, bắt `pageerror`.
7. Republish artifact **cùng URL**, rồi `device_commit_files` về thư mục của người dùng.

### Ý tưởng tính năng chưa làm (tích luỹ qua các chặng)
**Ưu tiên cao — đã có đủ dữ liệu để code ngay:**
- **Máy tính DCA**: nhập số tiền/tháng + số năm + tỷ suất → hai đường (chỉ tích luỹ vs có đầu tư), nối
  thẳng sang quy tắc 4% ra thu nhập thụ động/tháng. *Đường dẫn mẫu đã có sẵn: 10 triệu/tháng × 20 năm ×
  10%/năm → 7,1 tỷ → 23 triệu/tháng (so với chỉ tích luỹ được 2,4 tỷ).*
- **Máy tính ngân sách 50/30/20** + mục tiêu quỹ dự phòng **12 tháng**: nhập thu nhập → app tính từng
  khoản và so với số thực tế người dùng đang có *(bài "Tiêu tiền thế nào cho hợp lý")*
- **Checklist 7 nguồn thu nhập**: đánh dấu đang có nguồn nào, nhập số tiền, app tính **tỷ lệ chủ động /
  thụ động** và "bạn đang dựa vào bao nhiêu nguồn" *(bài "7 nguồn thu nhập")*
- **Phân loại Thợ săn / Nông dân ngắn ngày / Nông dân dài ngày** dựa trên tỷ lệ thu nhập thụ động /
  chi tiêu, kèm phép thử *"nếu mình biến mất 3 tháng, thu nhập nào còn lại?"*
- **Chỉ số bội số nghỉ việc**: thu nhập thụ động ÷ lương, hai mốc **1,0×** và **2,0×**
- ~~**Bộ lọc cổ phiếu hai luồng**~~ — **ĐÃ LÀM**, xem mục *Tab Bộ lọc* bên dưới
- **Máy tính MUA vs THUÊ NHÀ** — mô hình đã dựng và kiểm chứng xong, xem `model/muathue.py`. Đầu ra
  quan trọng nhất là **điểm hoà vốn**: nhà phải tăng bao nhiêu %/năm thì mua mới hoà với thuê-rồi-đầu-tư.
- **Biểu mẫu Ikigai** — 4 ô nhập tự do (thích làm · làm giỏi · xã hội cần · làm ra tiền), lưu localStorage
- **Checklist 10 bài học đầu tư** — tự chấm, cùng kiểu với checklist 9 nguyên tắc chi tiêu
- **Đối chiếu 12 nấc thang** với tab Bản đồ — nấc 10/11/12 tính tự động từ thu nhập thụ động so với ba
  mức chi tiêu (tối thiểu / hiện tại / mong muốn) mà người dùng đã nhập
- **Timeline 18–35** — nhập tuổi hiện tại → app chỉ ra vị trí trên cả hai sơ đồ *lối mòn* và *đáng sống*,
  và còn bao nhiêu năm trong "cửa sổ đầu tư 18–35"

**Ưu tiên trung bình:**
- **Cảnh báo tỷ lệ trả nợ / thu nhập vượt 40%** trong máy tính *(bài "Tuổi trẻ có nên mua nhà")*
- Ô nhập **"3 thứ quan trọng nhất với bạn"** để đối chiếu với chi tiêu thực tế *(bài "Nguyên tắc chi tiêu P2")*
- **Checklist 9 nguyên tắc chi tiêu** để người dùng tự đánh dấu đã áp dụng được nguyên tắc nào
- **Checklist tự soi môi trường** — bạn bè / đồng nghiệp / nơi ở / bạn đời *(bài "Kiến tạo môi trường")*
- **Chỉ số gây dựng lại**: tự chấm 4 yếu tố (kiến thức, kinh nghiệm, quan hệ, uy tín) + ước lượng số năm
- **Checklist 4 sai lầm đầu tư** + **4 câu hỏi tự soi về giá trị**
- **Danh sách vấn đề** (pain point journal) — ô nhập nhanh, lưu localStorage
- **Câu hỏi "con số nào đủ để bạn TỰ DO?"** đặt cạnh con số 25×

**Số tham chiếu đã thu được:**
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
- Ô *tỷ suất kỳ vọng* hiện mặc định 6% — có thể gợi ý theo số liệu trên
