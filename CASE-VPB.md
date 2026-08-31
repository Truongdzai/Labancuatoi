# MẪU KIỂM ĐỊNH SỨC KHOẺ NGÂN HÀNG
### Banking Stress-Test Template · bản mẫu chạy trên VPB, tháng 8/2026

> **Cách dùng lại tài liệu này cho ngân hàng khác:** copy file, thay tên mã ở tiêu đề, xoá
> cột *"VPB (mẫu)"* trong các bảng và điền lại. Phần quy trình, ngưỡng cảnh báo và
> checklist giữ nguyên — chúng không phụ thuộc vào mã nào.
>
> **Đây không phải khuyến nghị đầu tư.** Tài liệu ghi lại kết quả cơ học của một bộ tiêu
> chí tự đặt, chạy trên dữ liệu công khai. Nó không kết luận nên mua hay không mua bất kỳ
> cổ phiếu nào.

**Công cụ:** tab *Bộ lọc* của `La-Ban-Tu-Do-Tai-Chinh.html`, **chế độ Ngân hàng**.
**Thang điểm:** luồng giá trị tối đa **14**, luồng động lượng tối đa **6**, hai luồng
**không bao giờ cộng lại**. Chi tiết ngưỡng: xem `APP-GUIDE.md` mục *Tab Bộ lọc*.

---

## PHẦN 0 — QUY TRÌNH SÁU BƯỚC

| Bước | Việc | Vì sao |
|---|---|---|
| 1 | Lấy số định giá từ **hai nguồn độc lập** | Bắt lỗi hiển thị của trang tổng hợp |
| 2 | Lấy số ngân hàng: **CAR · nợ xấu · bao phủ nợ xấu** | Không có trên trang tổng hợp, phải lấy từ công bố của ngân hàng hoặc bảng ngành |
| 3 | **Đối chiếu riêng lẻ với hợp nhất** | Chênh lệch là chỗ rủi ro trốn |
| 4 | Chạy **ít nhất hai kịch bản** khi dữ liệu vênh | Biết kết luận có phụ thuộc vào chỗ vênh không |
| 5 | Kiểm tra **xu hướng**, không chỉ ảnh chụp | Một quý xấu là ngẫu nhiên, hai quý là xu hướng |
| 6 | Làm **checklist thủ công** ở Phần 5 | Có thứ không ô nhập nào đo được |

---

## PHẦN 1 — BẢNG THU THẬP DỮ LIỆU

### 1.1 Số định giá

| Ô nhập | Nguồn nên dùng | VPB (mẫu) |
|---|---|---|
| Giá | Bảng giá bất kỳ | 27.800 ₫ |
| Vốn hoá | Giá × CP **lưu hành** | **220.563 tỷ** |
| P/E | Phải là **trailing**, không phải forward | **7,40** *(EPS tính tới Q2/2026)* |
| P/B | Giá ÷ BVPS | **1,24** ⚠ xem 1.4 |
| ROE | LNST 4 quý ÷ vốn chủ bình quân | **16,7%** *(suy ra: EPS ÷ BVPS)* |

### 1.2 Số riêng của ngân hàng

| Ô nhập | Nguồn | VPB (mẫu) |
|---|---|---|
| CAR hợp nhất | Công bố định kỳ của ngân hàng | **13%** *(Basel II, H1/2026)* |
| CAR kỳ trước | " | hơn 14% *(cuối 2025)* — **đang giảm** |
| Nợ xấu hợp nhất | Thuyết minh BCTC, nhóm 3+4+5 | **3,28%** ⚠ xem Phần 2 |
| Nợ xấu riêng lẻ | " | 2,03% |
| Bao phủ nợ xấu | Dự phòng ÷ nợ xấu | **57%** |
| Nợ xấu quý trước | BCTC quý liền trước | ~3,58% ⚠ khác mẫu số |
| Nợ xấu 2 quý trước | BCTC quý trước nữa | **không tìm được** |

### 1.3 Số động lượng và sự kiện

| Ô nhập | VPB (mẫu) |
|---|---|
| Room ngoại còn lại | **6,80%** |
| Đà giá 12 tháng | **−16,01%** |
| Ứng viên nâng hạng FTSE | **Có** — nhóm Mid Cap, 1 trong 6 mã đồng thời vào FTSE All-World |
| Lãi tiết kiệm đối chiếu | 5,5% *(mặc định — sửa theo ngân hàng bạn dùng)* |

### 1.4 Lỗi dữ liệu đã bắt được — kiểm tra tương tự cho mã khác

| Hiện tượng | Chi tiết ở VPB |
|---|---|
| **Trang tổng hợp mâu thuẫn với chính nó** | CafeF hiển thị P/B **1,15**, nhưng BVPS 22.480 ₫ của chính CafeF chia cho giá 27.800 ₫ ra **1,24**. Dùng 1,24 vì nó nhất quán nội bộ và khớp nguồn thứ hai |
| **Trang lớn vẫn có lỗi thô** | TradingView hiển thị P/E (TTM) = **0** |
| **Chỉ số không được công bố** | Không nguồn nào công bố ROE trực tiếp — phải suy ra bằng đẳng thức **ROE = P/B ÷ P/E** |

---

## PHẦN 2 — ⚠ CẢNH BÁO VÊNH DỮ LIỆU: RIÊNG LẺ vs HỢP NHẤT

**Đây là mục quan trọng nhất của cả tài liệu. Làm trước khi nhập bất cứ số nào.**

### 2.1 Vênh loại một — riêng lẻ thấp hơn hợp nhất

| | VPB |
|---|---|
| Nợ xấu **riêng lẻ** | **2,03%** |
| Nợ xấu **hợp nhất** | **3,28%** |
| Chênh lệch | **1,25 điểm phần trăm** |

Chênh lệch đến từ **công ty con làm tài chính tiêu dùng** — mảng cho vay rủi ro cao hơn
ngân hàng lõi, chỉ xuất hiện ở báo cáo hợp nhất.

> **Truyền thông của ngân hàng gần như luôn dẫn con số riêng lẻ** vì nó đẹp hơn. Nếu bạn
> nhập nhầm số riêng lẻ vào ô nợ xấu, điểm sẽ từ **0/2 nhảy lên 1/2** và **cờ đỏ "nợ xấu
> trên 3%" biến mất hoàn toàn**. Bạn sẽ nhìn một ngân hàng khác với ngân hàng bạn định mua.

**Quy tắc: luôn dùng số HỢP NHẤT.** Bạn mua cổ phần của tập đoàn, không phải của riêng
ngân hàng mẹ.

### 2.2 Vênh loại hai — hai nguồn nói ngược nhau

| Nguồn | Nợ xấu hợp nhất |
|---|---|
| Bảng thống kê ngành (bên thứ ba) | **3,28%** |
| VPBank tự công bố | **"dưới 3%"** *(theo Thông tư 31)* |

**3,28% không thể đồng thời là "dưới 3%".** Giả thuyết hợp lý nhất: hai bên dùng hai chuẩn
phân loại khác nhau — ngân hàng tính theo Thông tư 31, bảng ngành lấy thẳng nhóm 3–5 từ
bảng cân đối. Mình không xác minh được bên nào đúng.

**Cách xử lý khi gặp vênh: đừng chọn bừa một số. Chạy cả hai và xem kết luận có đổi không.**
Đó là Phần 3.

---

## PHẦN 3 — MA TRẬN ĐỘ NHẠY

Giữ nguyên mọi ô khác, chỉ đổi ô đang vênh.

| | **Kịch bản A** | **Kịch bản B** |
|---|---|---|
| Giả định nợ xấu hợp nhất | **3,28%** *(bảng ngành)* | **2,99%** *(ranh giới "dưới 3%")* |
| Điểm nợ xấu | 0/2 | 1/2 |
| **Điểm giá trị** | **11 / 14 — 79%** | **12 / 14 — 86%** |
| **Điểm động lượng** | **3 / 6 — 50%** | **3 / 6 — 50%** |
| Số cảnh báo | **3** | **2** |
| Cờ "nợ xấu trên 3%" | **BẬT** | tắt |
| **Góc phần tư** | **Bẫy giá trị / cơ hội giá trị** | **Bẫy giá trị / cơ hội giá trị** |

> **Đọc ma trận:** chênh lệch chỉ **1 điểm** và **góc phần tư không đổi**. Nghĩa là kết
> luận của công cụ **không phụ thuộc** vào chỗ dữ liệu vênh. Đây chính là lý do phải chạy
> hai kịch bản thay vì tranh cãi xem số nào đúng.
>
> Nếu ở một mã khác mà hai kịch bản cho **hai góc phần tư khác nhau**, thì bạn *bắt buộc*
> phải giải quyết chỗ vênh trước khi kết luận bất cứ điều gì.

### 3.1 Chi tiết chấm điểm — kịch bản A

| Tiêu chí | Giá trị | Điểm | Ghi chú |
|---|---|---|---|
| Vốn hoá | 220.563 tỷ | **2/2** | Đạt ngưỡng LargeCap |
| P/E | 7,40 lần | **2/2** | Rẻ so với mặt bằng |
| P/B | 1,24 lần | **2/2** | Vùng tối ưu ngân hàng (1,0–1,4) |
| ROE | 16,7% | **2/2** | Sinh lời trên vốn chủ tốt |
| CAR | 13,0% | **2/2** | Đệm vốn dày |
| **Nợ xấu** | **3,28%** | **0/2** | **Nợ xấu cao** |
| **Bao phủ nợ xấu** | **57%** | **1/2** | **Trích lập một phần** |
| | | **11/14** | |
| Room ngoại còn lại | 6,80% | 1/2 | Dư địa vừa phải |
| Đà giá 12 tháng | −16,0% | 0/2 | Giá giảm trong 12 tháng |
| Ứng viên FTSE | Có | 2/2 | Thông tin đã công khai |
| | | **3/6** | |

Lợi suất lợi nhuận (1/PE) = **13,5%** so với lãi tiết kiệm 5,5% — không kích hoạt cờ.

---

## PHẦN 4 — RỦI RO ẨN: THỨ BẢNG ĐIỂM KHÔNG NÓI RA

### 4.1 Nợ xấu tăng nhanh hơn tín dụng — dấu hiệu bảng điểm bỏ sót

| | Nửa đầu 2026 |
|---|---|
| Nợ xấu tuyệt đối | **+21%** so với cuối 2025 *(vượt 38.000 tỷ)* |
| Tăng trưởng tín dụng | **+11–12%** |
| **Chênh lệch** | **nợ xấu tăng nhanh gần gấp đôi tín dụng** |

**Đây chính xác là điều kiện mà cờ đỏ "nợ xấu tăng hai quý liên tiếp" được thiết kế để bắt.**
Vì tỷ lệ nợ xấu = nợ xấu ÷ dư nợ, nợ xấu tăng nhanh hơn dư nợ **tương đương** tỷ lệ tăng.

**Nhưng cờ không bật.** Lý do là dữ liệu, không phải là điều kiện không xảy ra:

| Kỳ | Nợ xấu hợp nhất | Tình trạng |
|---|---|---|
| Q4/2025 | **~3,02%** | ⚠ **số suy ra**, không phải số công bố |
| Q1/2026 | ~3,58% | ⚠ tính trên dư nợ khách hàng — có thể khác mẫu số |
| Q2/2026 | 3,28% | Bảng ngành |

Chuỗi 3,02 → 3,58 → 3,28 là **tăng rồi giảm**, nên không thoả điều kiện hai quý liên tiếp
tăng. Nhưng hai trong ba điểm dữ liệu không đáng tin: một là số suy ra, một có thể khác mẫu
số.

> **Kết luận trung thực: cờ này KHÔNG đánh giá được với dữ liệu hiện có.** "Không bật" ở
> đây nghĩa là *chưa kiểm tra được*, không phải *đã kiểm tra và an toàn*. Hai điều đó rất
> khác nhau, và đừng để bảng điểm làm bạn nhầm.
>
> Cờ đã được kiểm chứng là hoạt động đúng: nhập chuỗi 3,02 → 3,28 → 3,58 thì nó bật và in
> ra cả chuỗi lẫn mức tăng 0,56 điểm phần trăm.

**Cách suy ra ~3,02%** *(ghi lại để tái sử dụng)*: nếu nợ xấu tăng 21% và tín dụng tăng
11,5% thì tỷ lệ nhân lên 1,21 ÷ 1,115 = 1,085. Lấy 3,28 ÷ 1,085 ≈ **3,02%**.
Đây là ước lượng để tham khảo, **không dùng thay số công bố**.

### 4.2 Bao phủ nợ xấu 57% — vùng nguy hiểm

| Ngưỡng | Ý nghĩa |
|---|---|
| > 100% | Đã trích lập vượt số nợ xấu ghi nhận |
| 80–100% | Chấp nhận được |
| **50–80%** | ⚠ **Vùng cảnh báo — VPB ở đây (57%)** |
| < 50% | Nguy hiểm |

Ở mức 57%, ngân hàng mới trích lập cho **hơn một nửa** số nợ xấu đã ghi nhận. Phần chưa
trích lập **đang nằm trong lợi nhuận của hôm nay**.

**Vì sao điều này nối với 4.1 thành một vấn đề duy nhất:** đệm dự phòng mỏng **và** nợ xấu
đang tăng nhanh hơn tín dụng là tổ hợp tệ. Nếu nợ xấu tiếp tục tăng, ngân hàng buộc phải
trích lập thêm, và khoản đó **trừ thẳng vào lợi nhuận** — chính là mẫu số của P/E 7,40 đang
làm cổ phiếu trông rẻ.

> Nói cách khác: **P/E rẻ và bao phủ mỏng có thể là cùng một sự việc nhìn từ hai phía.**

### 4.3 CAR đang giảm

Hơn 14% *(cuối 2025)* → **13%** *(H1/2026)*. Vẫn được 2/2 điểm vì trên ngưỡng 12%, nhưng
**hướng đi quan trọng ngang với mức tuyệt đối**, và bảng điểm chỉ đo mức tuyệt đối.

### 4.4 Đà giá — cửa sổ đo làm đổi kết luận

| Cửa sổ | Biến động |
|---|---|
| 12 tháng | **−16,01%** ← ô đang nhập |
| 6 tháng | −4,30% |
| 1 tháng | **+14,17%** |
| 5 phiên | +11,65% |

Điểm 0/2 đến từ cửa sổ 12 tháng. Nếu đổi sang cửa sổ 1 tháng, điểm động lượng **đảo chiều
hoàn toàn**. Đây là giới hạn của ô nhập, không phải của cổ phiếu — hãy ghi lại cửa sổ mình
dùng.

### 4.5 Room ngoại là số động

Room còn lại 6,80% được tính trên trần hiện hành. Có thông tin về việc các ngân hàng nhận
chuyển giao bắt buộc được nới trần. **Nếu trần đổi, con số 6,80% mất ý nghĩa.** Kiểm tra
trần đang áp dụng trước khi nhập.

---

## PHẦN 5 — CHECKLIST THỦ CÔNG BẮT BUỘC

Ba việc này **không có ô nhập nào thay thế được**. Làm xong mới đọc bảng điểm.

### ☐ 1. Mở thuyết minh BCTC quý gần nhất, lấy nợ xấu hợp nhất **chính xác**

- Tìm phần **phân loại nợ theo nhóm**; nợ xấu = **nhóm 3 + 4 + 5**
- Xác nhận đang đọc cột **hợp nhất**, không phải ngân hàng riêng lẻ
- Ghi lại **chuẩn phân loại** đang dùng — đây là chỗ tạo ra chênh lệch ở Phần 2.2
- *Việc này giải quyết trực tiếp vênh 3,28% vs "dưới 3%"*

### ☐ 2. Truy nợ xấu **Q4/2025** để chạy đủ chuỗi ba quý

- Lấy từ BCTC quý 4/2025, **cùng phạm vi và cùng chuẩn** với hai quý còn lại
- Nhập vào ô *"Nợ xấu 2 quý trước"* để cờ xu hướng chạy được thật
- *Không có số này thì cờ quan trọng nhất của chế độ ngân hàng đang tắt tiếng*

### ☐ 3. Tính **nợ tái cơ cấu chưa chuyển nhóm**

- Tìm trong thuyết minh phần nợ được cơ cấu lại thời hạn trả nợ, giữ nguyên nhóm
- So với **tổng nợ xấu đang ghi nhận**
- Nếu khoản này lớn so với nợ xấu, thì **tỷ lệ nợ xấu bạn vừa nhập đang đẹp hơn thực tế** —
  vì phần đó có thể rơi xuống nhóm 3–5 ở các kỳ sau
- *Đây là chỗ rủi ro trốn kỹ nhất, và không bảng điểm nào bắt được*

---

## PHẦN 6 — ĐỌC KẾT QUẢ

**Góc phần tư: "Hình dạng của cơ hội giá trị — và cũng là hình dạng của bẫy giá trị"**
*(giá trị 79% cao · động lượng 50% thấp)*

Góc này **không kết luận rẻ**. Nó nói: rẻ mà chưa ai mua thì hoặc thị trường sai, hoặc thị
trường biết điều bạn chưa biết — và từ bên trong rất khó phân biệt. Nó giao đúng một bài
tập: **viết ra vì sao thị trường định giá thấp thế này.**

### Bài học lớn nhất của case này

| | Chế độ thường | Chế độ ngân hàng |
|---|---|---|
| Điểm giá trị | **8/8 = 100%** | **11/14 = 79%** |
| Cờ đỏ rủi ro tín dụng | **0** | **2** |
| Trả lời được câu hỏi của góc phần tư? | Không | **Có giả thuyết kiểm chứng được** |

Ở chế độ thường, bảng số **trông hoàn hảo** — và câu hỏi *"vì sao thị trường định giá
thấp?"* hoàn toàn không có lời giải. Chế độ ngân hàng làm lộ ra **nợ xấu hợp nhất quanh
hoặc trên 3% với bao phủ chỉ 57%**.

Đó chưa phải câu trả lời chắc chắn. Nhưng trước khi nâng cấp thì **không có giả thuyết
nào cả** — và một giả thuyết kiểm chứng được thì hơn hẳn một điểm số 100% không giải
thích được gì.

---

## PHẦN 7 — NHỮNG GÌ CÔNG CỤ KHÔNG THẤY

Kể cả khi đủ CAR, nợ xấu và bao phủ, bảng điểm vẫn **không đo được**:

- **Mức độ tập trung danh mục cho vay** — vài khách hàng lớn chiếm bao nhiêu dư nợ
- **Tỷ trọng cho vay bất động sản và trái phiếu doanh nghiệp**
- **Nợ tái cơ cấu chưa chuyển nhóm** *(xem checklist mục 3)*
- **Cho vay bên liên quan**
- **Chất lượng nguồn vốn** — tỷ lệ CASA, phụ thuộc vốn liên ngân hàng, vốn ngoại
- **Chất lượng lợi nhuận** — bao nhiêu từ ngân hàng lõi, bao nhiêu từ tài chính tiêu dùng,
  bao nhiêu từ khoản bất thường một lần

**Đó mới là những thứ làm sập một ngân hàng.** Không ô nhập nào ở trên chạm tới chúng.

---

## GHI CHÚ

**Ngày chạy:** 30/08/2026 · **Dữ liệu:** tính tới Q2/2026 và giá phiên 28/08/2026.
Số liệu thị trường thay đổi hàng ngày — chạy lại trước khi dùng.

**Nguồn:** CafeF · Simplize · TradingView *(số định giá)* · Báo Chính phủ *(CAR)* ·
VietnamBiz *(nợ xấu hợp nhất, bao phủ nợ xấu — bảng ngành)* · TheLEADER *(nợ xấu Q1/2026)* ·
Vietstock · KIS *(nợ xấu riêng lẻ)*.

**Không phải khuyến nghị đầu tư.** Tài liệu này ghi lại kết quả cơ học của một bộ tiêu chí
tự đặt, chạy trên dữ liệu công khai có **một chỗ mâu thuẫn chưa giải được**, **một chỉ số
phải suy ra**, và **một cờ đỏ không đánh giá được vì thiếu dữ liệu**. Các ngưỡng chấm điểm
là quy ước nội bộ, không phải chuẩn mực ngành. Người viết không phải chuyên gia tư vấn tài
chính có giấy phép.
