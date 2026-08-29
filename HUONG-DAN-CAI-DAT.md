# LA BÀN TỰ DO TÀI CHÍNH — HƯỚNG DẪN CÀI ĐẶT

Tài liệu này dành cho bạn, không dành cho lập trình viên. Làm theo đúng thứ tự là xong.

---

## MỤC LỤC

1. [Trước khi bắt đầu](#1-trước-khi-bắt-đầu)
2. [Đưa app lên mạng bằng GitHub Pages](#2-đưa-app-lên-mạng-bằng-github-pages)
3. [Cài lên điện thoại Android](#3-cài-lên-điện-thoại-android)
4. [Cập nhật app sau khi sửa code](#4-cập-nhật-app-sau-khi-sửa-code)
5. [Sao lưu và chuyển dữ liệu giữa máy tính và điện thoại](#5-sao-lưu-và-chuyển-dữ-liệu)
6. [Về chuyện riêng tư — đọc kỹ](#6-về-chuyện-riêng-tư)
7. [Nếu muốn file APK thật thay vì PWA](#7-nếu-muốn-file-apk-thật)
8. [Gặp trục trặc](#8-gặp-trục-trặc)

---

## 1. TRƯỚC KHI BẮT ĐẦU

### Bạn đang có hai bản của cùng một app

| Bản | Đường dẫn | Dùng khi nào |
|---|---|---|
| **Một file** | `La-Ban-Tu-Do-Tai-Chinh.html` | Nhấp đúp là mở trên máy tính. Không cài được lên điện thoại. |
| **PWA** | thư mục `app/` | Đưa lên mạng để cài lên điện thoại như một app thật. |

Hai bản có nội dung giống hệt nhau. Bản một file được sinh ra tự động từ `app/index.html`.

> ⚠️ **Chỉ sửa `app/index.html`.** File ở thư mục gốc bị ghi đè mỗi lần chạy `node build.mjs`.

### Vì sao phải đưa lên mạng mới cài được?

Service worker — thứ giúp app chạy khi không có mạng — chỉ được trình duyệt cho phép chạy trên **HTTPS**.
Mở file bằng `file://` trên điện thoại sẽ không cài được. Không có cách nào lách chuyện này.

### Cần cài sẵn trên máy tính

- **Git** — tải ở <https://git-scm.com/download/win>, cài với toàn bộ tuỳ chọn mặc định.
- **Một tài khoản GitHub** — đăng ký miễn phí ở <https://github.com/signup>.

Kiểm tra Git đã cài xong chưa:

```bash
git --version
```

---

## 2. ĐƯA APP LÊN MẠNG BẰNG GITHUB PAGES

### 2.1. Tạo repo trên GitHub

1. Vào <https://github.com/new>
2. **Repository name**: đặt một cái tên **khó đoán**, ví dụ `la-ban-k7m2x9` — đừng đặt `la-ban-tu-do-tai-chinh`.
   Lý do ở [mục 6](#6-về-chuyện-riêng-tư).
3. Chọn **Public**. *(GitHub Pages gói miễn phí bắt buộc repo phải công khai.)*
4. **Đừng** tick "Add a README file".
5. Bấm **Create repository**.

Sau khi tạo, GitHub hiện một trang hướng dẫn — cứ để đó, bước sau sẽ dùng tới địa chỉ repo.

### 2.2. Đẩy code lên

Mở **Git Bash** (bấm chuột phải trong thư mục dự án → *Open Git Bash here*), rồi chạy lần lượt:

```bash
cd "D:/Hành trình tự do tài chính"
```

```bash
git init -b main
```

```bash
git add app build.mjs test.mjs test-pwa.mjs shot.mjs serve.mjs tao-icon.py APP-GUIDE.md HUONG-DAN-CAI-DAT.md La-Ban-Tu-Do-Tai-Chinh.html
```

> Lệnh trên **cố ý không đẩy** `Cam-nang-*.md`, `muathue.py`, `verify.py`, thư mục `Hieutv/`,
> `anh-chup/` và `_luu-tru/` lên mạng. Muốn đẩy hết thì thay bằng `git add .`

```bash
git commit -m "La Bàn Tự Do Tài Chính - ban dau"
```

Thay `TEN-GITHUB` và `TEN-REPO` bằng của bạn:

```bash
git remote add origin https://github.com/TEN-GITHUB/TEN-REPO.git
```

```bash
git push -u origin main
```

Lần đầu push, một cửa sổ đăng nhập GitHub sẽ hiện ra — đăng nhập bằng trình duyệt là xong.

### 2.3. Bật GitHub Pages

1. Vào repo trên GitHub → tab **Settings** → mục **Pages** ở cột trái.
2. **Source**: chọn `Deploy from a branch`.
3. **Branch**: chọn `main`, thư mục chọn **`/ (root)`**, bấm **Save**.
4. Chờ 1–3 phút. Tải lại trang Settings › Pages, GitHub sẽ hiện dòng
   *"Your site is live at https://TEN-GITHUB.github.io/TEN-REPO/"*.

### 2.4. Địa chỉ app của bạn

App nằm trong thư mục `app/`, nên địa chỉ đầy đủ là:

```
https://TEN-GITHUB.github.io/TEN-REPO/app/
```

**Nhớ dấu `/` ở cuối** — thiếu nó thì service worker đăng ký sai phạm vi và app sẽ không chạy offline.

Mở địa chỉ đó trên máy tính trước để chắc chắn nó hiện đúng.

### 2.5. Thử trước ở máy, không cần mạng

Nếu muốn xem thử trước khi đẩy lên GitHub:

```bash
node serve.mjs
```

Rồi mở <http://localhost:8080> bằng Chrome. Service worker chạy được trên `localhost`, nên bạn
thử được đầy đủ. Bấm `Ctrl+C` trong cửa sổ lệnh để dừng.

---

## 3. CÀI LÊN ĐIỆN THOẠI ANDROID

1. Mở **Chrome** trên điện thoại (phải là Chrome — trình duyệt mặc định của hãng có thể không hỗ trợ).
2. Gõ địa chỉ app vào — nhớ có `/app/` ở cuối.
3. Chờ trang tải xong hoàn toàn.
4. Bấm menu **⋮** ở góc trên bên phải.
5. Chọn **"Thêm vào Màn hình chính"** *(hoặc "Cài đặt ứng dụng" / "Install app" — tên gọi thay đổi theo phiên bản Chrome)*.
6. Chrome hiện hộp thoại với icon la bàn và tên **La Bàn** → bấm **Thêm** / **Cài đặt**.
7. Icon xuất hiện trên màn hình chính. Mở từ icon đó, app chạy **toàn màn hình**, không có thanh địa chỉ.

### Kiểm tra đã cài đúng chưa

- Mở app từ icon → không thấy thanh địa chỉ của Chrome ở trên → **đúng**.
- Bật chế độ máy bay rồi mở app → vẫn vào được, vẫn đủ 196 thẻ cẩm nang → **service worker đang chạy**.
- Nếu vẫn thấy thanh địa chỉ thì bạn mới tạo lối tắt chứ chưa cài app: xoá icon đi và làm lại từ bước 4,
  nhớ chọn đúng mục có chữ *"Cài đặt"* hoặc *"Install"*.

---

## 4. CẬP NHẬT APP SAU KHI SỬA CODE

### Quy trình mỗi lần sửa

**Bước 1.** Sửa nội dung trong `app/index.html`.

**Bước 2.** Đổi số phiên bản trong `app/sw.js` — dòng đầu tiên:

```js
const PHIEN_BAN = "la-ban-v1.0.1";   // tăng số lên
```

> ⚠️ **Quên bước này là điện thoại sẽ giữ mãi bản cũ.** Service worker chỉ tải lại toàn bộ
> khi tên cache đổi. Đây là lỗi phổ biến nhất khi làm PWA.

**Bước 3.** Chạy kiểm thử và dựng lại bản một file:

```bash
node test.mjs
```

```bash
node build.mjs
```

**Bước 4.** Đẩy lên:

```bash
git add -A && git commit -m "cap nhat" && git push
```

**Bước 5.** Chờ 1–2 phút để GitHub Pages dựng lại.

### Trên điện thoại

App tự nhận bản mới ở lần mở kế tiếp, nhưng **phải đóng hẳn app rồi mở lại** thì bản mới mới có hiệu lực
(đóng hẳn = vuốt app ra khỏi danh sách app đang chạy, không phải chỉ bấm nút Home).

Khi app phát hiện có bản mới, nó hiện một dòng nhắc ở đáy màn hình: *"Đã có bản mới. Đóng hẳn app rồi mở lại để cập nhật."*

Nếu vẫn kẹt bản cũ: Chrome → **⋮** → Cài đặt → Cài đặt trang web → Tất cả trang web → tìm địa chỉ của bạn → **Xoá & đặt lại**.

> ⚠️ Thao tác đó **xoá luôn số liệu** đang lưu. Xuất file sao lưu trước khi làm.

---

## 5. SAO LƯU VÀ CHUYỂN DỮ LIỆU

### Nguyên tắc

Số liệu của bạn nằm trong **localStorage** của từng trình duyệt, trên từng máy. Máy tính và điện thoại là
**hai kho riêng biệt, không tự đồng bộ**. Cách chuyển qua lại là xuất/nhập file JSON bằng tay.

### Xuất file sao lưu

1. Mở app → tab **Dữ liệu**.
2. Bấm **Xuất file sao lưu**.
3. Trên máy tính: file vào thư mục Downloads. Trên điện thoại: file vào thư mục **Tải xuống**.
4. Tên file dạng `la-ban-tu-do-tai-chinh-2026-08-29.json`.

Tab Dữ liệu có hiện ngày sao lưu gần nhất và nhắc bạn khi đã quá 30 ngày.

### Chuyển từ máy tính sang điện thoại

1. Trên máy tính: xuất file sao lưu.
2. Gửi file qua Google Drive, Zalo, Telegram, hoặc tự gửi email cho chính mình.
3. Trên điện thoại: tải file về (nhớ **tải về**, đừng chỉ mở xem trước).
4. Mở app → tab **Dữ liệu** → **Nhập từ file** → chọn file vừa tải.

Chiều ngược lại làm y hệt.

> ⚠️ **Nhập là ghi đè toàn bộ**, không phải gộp. Số liệu đang có trên máy đích sẽ bị thay thế hoàn toàn.
> Nếu cả hai bên đều có số liệu mới, hãy xuất bản của máy đích ra trước khi nhập.

### Khi nào dữ liệu sẽ mất

- Xoá dữ liệu duyệt web của Chrome (mục **Cookie và dữ liệu trang web**)
- Gỡ app khỏi màn hình chính
- Dùng chế độ ẩn danh
- Android tự dọn dữ liệu của app lâu không mở

Thói quen an toàn: **xuất file sao lưu mỗi lần nhập xong số liệu tháng mới.**

---

## 6. VỀ CHUYỆN RIÊNG TƯ

### Số liệu của bạn không đi đâu cả

App không có máy chủ, không đăng nhập, không analytics, không gửi số liệu đi bất cứ đâu.
Trang web trên GitHub Pages **chỉ chứa mã nguồn**; mọi con số bạn nhập do trình duyệt trên máy bạn giữ.
Kể cả khi ai đó mở đúng địa chỉ app của bạn, họ cũng chỉ thấy một app trống — số liệu của bạn
không nằm trên đó.

### Nhưng địa chỉ và mã nguồn thì công khai

GitHub Pages gói miễn phí bắt buộc repo phải Public. Nghĩa là:

- Ai biết địa chỉ đều mở được app (nhưng chỉ thấy app trống).
- Mã nguồn app ai cũng xem được — không sao, nó không chứa gì riêng tư.

Ba việc đã làm sẵn để giảm rủi ro:

| Đã làm | Tác dụng |
|---|---|
| `<meta name="robots" content="noindex, nofollow">` | Google không đưa trang vào kết quả tìm kiếm |
| `app/robots.txt` chặn toàn bộ | Các bộ thu thập dữ liệu tuân thủ chuẩn sẽ bỏ qua |
| Khuyên đặt tên repo khó đoán | Không ai mò ra địa chỉ bằng cách đoán tên |

### Nếu muốn khoá hẳn trang lại bằng mật khẩu

GitHub Pages miễn phí không làm được. Hai lựa chọn nếu sau này bạn đổi ý:

- **Cloudflare Pages + Cloudflare Access** — miễn phí tới 50 người dùng, bắt đăng nhập bằng email
  trước khi vào trang. Đây là cách duy nhất thật sự khoá trang mà không tốn tiền.
- **GitHub Pro** — khoảng 4 đô/tháng, cho phép Pages chạy từ repo private.

Cả hai đều dùng lại nguyên thư mục `app/`, không phải sửa gì trong code.

---

## 7. NẾU MUỐN FILE APK THẬT

PWA đã cho bạn gần như mọi thứ của một app thật: icon riêng, chạy toàn màn hình, hoạt động offline.
Thứ duy nhất nó không có là **file APK để cài trực tiếp hoặc đưa lên Google Play**.

Muốn có APK thì cần thêm:

| Việc phải làm | Độ khó |
|---|---|
| Cài **Java JDK 17** và **Android SDK** (khoảng 3–5 GB) | trung bình |
| Cài **Bubblewrap** (`npm i -g @bubblewrap/cli`) — công cụ đóng gói PWA thành TWA | dễ |
| Tạo **khoá ký** (keystore) và giữ nó thật kỹ — mất khoá là không cập nhật app được nữa | trung bình |
| Đặt file `assetlinks.json` lên hosting để Android tin rằng bạn sở hữu domain đó | trung bình |
| Nếu muốn lên Google Play: trả **25 đô một lần**, khai báo chính sách quyền riêng tư, chờ duyệt | mất thời gian |

**Ước lượng:** một buổi làm việc nếu mọi thứ suôn sẻ, một hai ngày nếu vướng cấu hình.

**Đánh giá thẳng thắn:** với một app chỉ mình bạn dùng, APK không mang lại thêm gì đáng kể so với PWA —
ngoài việc icon trông "chính thức" hơn một chút. Nên làm PWA trước, dùng vài tháng, nếu thật sự thấy
thiếu thì lúc đó tính tiếp. Bubblewrap đóng gói chính cái PWA này, nên công sức bỏ ra bây giờ không phí.

---

## 8. GẶP TRỤC TRẶC

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Chrome không hiện mục "Cài đặt ứng dụng" | Chưa vào bằng HTTPS, hoặc thiếu dấu `/` cuối địa chỉ, hoặc trang chưa tải xong. Thử tải lại trang rồi chờ vài giây. |
| Cài xong nhưng vẫn thấy thanh địa chỉ | Bạn mới tạo lối tắt. Xoá icon, làm lại và chọn đúng mục "Cài đặt"/"Install". |
| Tắt mạng thì app trắng trang | Service worker chưa cài xong. Mở app khi có mạng, chờ khoảng 10 giây, đóng rồi mở lại. |
| Sửa code rồi mà điện thoại vẫn bản cũ | Quên đổi `PHIEN_BAN` trong `app/sw.js`. Đổi số, push lại, rồi đóng hẳn app trên điện thoại. |
| Trang 404 sau khi bật Pages | Chờ thêm 2–3 phút. Kiểm tra Settings › Pages chọn đúng branch `main` và thư mục `/ (root)`. |
| Chữ hiện sai font khi không có mạng | Lần đầu mở phải có mạng để tải font về cache. Mở lại một lần khi có mạng là xong. |
| Nút "Xuất file sao lưu" không làm gì | Chrome đang chặn tải xuống. Kiểm tra thông báo ở đáy màn hình, hoặc dùng ô "Sao lưu thủ công" hiện ra bên dưới để chép tay. |
| Mất hết số liệu | Nhập lại từ file sao lưu gần nhất (tab Dữ liệu › Nhập từ file). Không có file sao lưu thì không khôi phục được. |

### Chạy lại toàn bộ kiểm thử

```bash
node test.mjs
```

```bash
node test-pwa.mjs
```

```bash
node shot.mjs
```

Ba lệnh này lần lượt kiểm: công thức tài chính · PWA và khả năng chạy offline · giao diện ở hai kích thước
màn hình kèm chụp ảnh vào thư mục `anh-chup/`.
