# La Bàn Tự Do Tài Chính

Ứng dụng web cá nhân giúp theo dõi hành trình tới tự do tài chính: bản đồ 12 bước, sáu máy tính
tài chính, nhật ký theo dõi, các biểu mẫu tự soi, và một cẩm nang 196 thẻ để tra cứu.

Có thêm một bộ khung để **chọn nơi bỏ tiền dài hạn rồi giữ kỷ luật với nó**: năm cửa phải qua
trước khi chọn, bảng chấm điểm ứng viên (12 tiêu chí cho cổ phiếu, 8 cho quỹ / ETF) với cơ chế
cờ đỏ phủ quyết điểm tổng, kế hoạch mua đều theo tháng, và một checklist hằng ngày về *hành vi*
chứ không phải về giá.

Chạy được offline, cài được lên điện thoại Android như một app thật.

**Mở app:** https://truongdzai.github.io/Labancuatoi/app/

---

## Không có dữ liệu cá nhân nào trong repo này

App **không có backend, không đăng nhập, không analytics**. Mọi con số người dùng nhập được lưu
trong `localStorage` của chính trình duyệt trên máy họ và không bao giờ rời khỏi máy đó.

Repo này chỉ chứa mã nguồn. Việc chuyển số liệu giữa máy tính và điện thoại làm bằng tay qua
xuất/nhập file JSON.

---

## Cấu trúc

```
app/                          ← BẢN PWA — nguồn duy nhất, sửa ở đây
├── index.html                ← toàn bộ HTML + CSS + JS trong một file
├── manifest.webmanifest
├── sw.js                     ← service worker, TĂNG PHIEN_BAN mỗi lần sửa app
└── icons/

index.html                    ← chuyển hướng sang ./app/
La-Ban-Tu-Do-Tai-Chinh.html   ← SINH TỰ ĐỘNG, bản một file mở bằng nhấp đúp
build.mjs                     ← kiểm tra tính toàn vẹn rồi sinh bản một file
test.mjs                      ← 39 test công thức tài chính
test-pwa.mjs                  ← 21 test PWA, gồm cả kịch bản tắt mạng
shot.mjs                      ← kiểm giao diện ở 1180px và 360px, chụp ảnh
serve.mjs                     ← máy chủ tĩnh để thử PWA ở localhost
tao-icon.py                   ← sinh lại icon PNG
muathue.py + verify.py        ← mô hình tham chiếu MUA vs THUÊ (Python)
APP-GUIDE.md                  ← tài liệu kiến trúc, đọc trước khi sửa code
HUONG-DAN-CAI-DAT.md          ← hướng dẫn deploy và cài lên Android
```

> ⚠️ Chỉ sửa `app/index.html`. File ở thư mục gốc bị `build.mjs` ghi đè.

---

## Vòng làm việc

```bash
node test.mjs        # công thức tài chính còn đúng không
node build.mjs       # kiểm cú pháp + PWA hợp lệ, rồi sinh bản một file
node shot.mjs        # duyệt hết tab/pane ở hai kích thước màn hình, chụp ảnh
node test-pwa.mjs    # manifest, service worker, tắt mạng vẫn chạy
```

Không dependency, không npm, không build step thật sự — `build.mjs` chỉ kiểm tra rồi sao chép.
Bộ kiểm thử lái Chrome có sẵn trên máy qua DevTools Protocol bằng `WebSocket` của Node 22+.
Nó tự dò Chrome ở các đường dẫn quen thuộc trên Windows, macOS và Linux; máy nào cài chỗ khác thì
đặt biến môi trường `CHROME` trỏ thẳng vào file thực thi.

Thử ở máy trước khi đẩy lên:

```bash
node serve.mjs       # rồi mở http://localhost:8080
```

---

## Về nội dung

Phần kiến thức trong app được **đúc kết và viết lại** từ series *Hành trình tự do tài chính* của
Hieu Nguyen (HIEU.TV). Đây là bản tóm lược để học và áp dụng, không thay thế việc xem đầy đủ các
tập gốc. Tài liệu gốc của tác giả không được đưa vào repo này.

Mô hình MUA vs THUÊ được dựng lại và kiểm chứng độc lập (`verify.py`, 9/9 đạt), **không** theo cách
tính của bảng tính gốc — lý do ghi trong `APP-GUIDE.md` mục 6.

---

## Miễn trừ trách nhiệm

Đây là công cụ ước tính cho mục đích cá nhân. **Không phải lời khuyên đầu tư, không phải tư vấn
tài chính, không phải lời khuyên mua bán bất động sản.** Quy tắc 4% là một quy ước phổ biến chứ
không phải bảo đảm. Mọi mô hình trong app đều dựa trên giả định do người dùng nhập vào, và các
giả định đó có thể sai.

Riêng phần **Chọn một thứ**: app không nối mạng, không có dữ liệu thị trường, và **không gợi ý
mã nào cả**. Nó chỉ là một bộ câu hỏi có cấu trúc — điểm số phản ánh đúng những gì người dùng
tự đi kiểm chứng được, không hơn. Chấm rộng tay thì điểm cao lên mà rủi ro không giảm đi chút
nào.
