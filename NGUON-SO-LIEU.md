# Lấy số liệu ở đâu để nhập vào Bộ lọc

## Kết quả thử lấy dữ liệu từ vietstock — báo cáo trung thực

Mình đã vào `vietstock.vn` và thử ba đường:

| Đường | Kết quả |
|---|---|
| `finance.vietstock.vn/doanh-nghiep-a-z` | Có bảng, nhưng **chỉ là danh bạ** — mã, tên, ngành, sàn, khối lượng niêm yết. **Không có P/E, P/B, ROE** |
| `finance.vietstock.vn/ban-do-thi-truong` | Có đủ dữ liệu nhưng **vẽ bằng canvas**, không có bảng HTML để đọc. Biến `_chartData` rỗng khi tải trang |
| Bộ lọc cổ phiếu | Không truy cập được ở tài khoản thường |

**Nên mình không dựng được bảng LargeCap kèm P/E, P/B, ROE như đã hứa.** Nói thẳng để bạn
khỏi chờ.

## Ảnh chụp thị trường lấy được (28/08/2026, 23:56)

| | |
|---|---|
| VN-Index | 1.832,12 (+0,56 · +0,03%) |
| HNX-Index | 284,77 (+2,13 · +0,75%) |
| UPCoM-Index | 127,50 (+0,34 · +0,27%) |
| GTGD toàn thị trường | 18.846,14 tỷ đồng |
| KLGD | 746,37 triệu CP |
| Số mã cổ phiếu | 1.545 |
| Nước ngoài mua | 2.115,06 |
| Nước ngoài bán | 1.777,45 |

*Hai dòng cuối trang không ghi rõ đơn vị. Suy ra là **tỷ đồng**, vì nếu là triệu cổ phiếu
thì riêng khối ngoại đã mua nhiều hơn tổng khối lượng giao dịch cả thị trường — vô lý.
Với đơn vị tỷ đồng thì khối ngoại mua ròng khoảng **338 tỷ**, chiếm ~11% giá trị giao
dịch, là mức hợp lý.*

**Đây là số liệu một ngày.** Nó không dùng để phân tích giá trị được, và không nên dùng.
Bản đồ thị trường của vietstock cũng chỉ tô màu theo **biến động trong ngày** — hoàn toàn
vô nghĩa với người đầu tư dài hạn.

## Lấy từng ô của Bộ lọc ở đâu

Nguồn tốt nhất và miễn phí là **báo cáo tài chính do chính công ty công bố**, không phải
trang tổng hợp. Trang tổng hợp tiện hơn nhưng có độ trễ và đôi khi tính khác nhau.

| Ô trong Bộ lọc | Lấy ở đâu | Cạm bẫy |
|---|---|---|
| **Vốn hoá** | Giá hiện tại × số cổ phiếu đang lưu hành | Dùng **lưu hành**, không dùng **niêm yết** — hai số này khác nhau khi có cổ phiếu quỹ |
| **P/E** | Giá ÷ EPS 4 quý gần nhất (BCTC quý) | Phải là **trailing** (4 quý đã qua). Nhiều trang hiển thị forward P/E dựa trên dự phóng — con số đó là kỳ vọng, không phải sự thật. **Đây là cạm bẫy số một** |
| **P/B** | Giá ÷ (vốn chủ sở hữu ÷ số CP lưu hành) | Vốn chủ lấy ở bảng cân đối kế toán, phần "Vốn chủ sở hữu", **không phải** "Vốn góp của chủ sở hữu" |
| **ROE** | Lợi nhuận sau thuế 4 quý ÷ vốn chủ bình quân | Nếu có khoản lãi bất thường một lần (bán tài sản, đánh giá lại) thì ROE năm đó vô nghĩa. Xem ROE 3–5 năm |
| **Nợ vay / Vốn chủ** | (Vay ngắn hạn + vay dài hạn) ÷ vốn chủ | **Chỉ tính nợ vay có lãi**, không tính toàn bộ nợ phải trả — phải trả người bán không phải là đòn bẩy |
| **Room ngoại còn lại** | Trang thông tin của HOSE/HNX hoặc bản công bố của công ty | Room tối đa khác nhau theo ngành; ngân hàng thường 30% |
| **Đà giá 12 tháng** | Biểu đồ giá bất kỳ | Nhớ dùng giá **đã điều chỉnh** cổ tức và chia tách |
| **Lãi tiết kiệm 12 tháng** | Biểu lãi suất niêm yết của ngân hàng bạn dùng | Dùng lãi suất niêm yết thường, không dùng lãi suất ưu đãi số tiền lớn |

## Chế độ ngân hàng — lấy CAR, nợ xấu, bao phủ ở đâu

Ba chỉ số này **không có trên các trang dữ liệu tổng hợp**. Phải lấy từ nguồn của chính
ngân hàng.

| Ô | Lấy ở đâu | Cạm bẫy |
|---|---|---|
| **CAR** | Bản công bố thông tin định kỳ hoặc báo cáo thường niên của ngân hàng; một số ngân hàng công bố trong bản tin nhà đầu tư hàng quý | CAR theo Thông tư 41 (Basel II) **khác** CAR theo Thông tư 36 cũ — số cao hơn hẳn. Phải biết mình đang đọc chuẩn nào |
| **Tỷ lệ nợ xấu** | Thuyết minh báo cáo tài chính, phần phân loại nợ theo nhóm | Nợ xấu = **nhóm 3+4+5**. Nhiều bản tin chỉ nói "nợ nhóm 5" hoặc chỉ tính ngân hàng riêng lẻ, không hợp nhất. Ngân hàng có công ty tài chính tiêu dùng thì số hợp nhất cao hơn nhiều |
| **Bao phủ nợ xấu** | Dự phòng rủi ro tín dụng ÷ tổng nợ xấu, cả hai ở thuyết minh | Dùng **dự phòng cho vay khách hàng**, không lẫn với dự phòng trái phiếu hay dự phòng chung |
| **Nợ xấu 2 quý trước** | BCTC quý của hai kỳ liền trước | Phải cùng phạm vi — đừng lấy quý này hợp nhất so với quý trước riêng lẻ, sẽ ra xu hướng giả |

**Một khoản không có ô nào để nhập, nhưng phải tự kiểm tra: nợ tái cơ cấu chưa chuyển
nhóm.** Khoản này chưa tính vào nợ xấu nhưng có thể rơi xuống nhóm 3–5 sau đó. Nếu con số
này lớn so với nợ xấu đang ghi nhận thì tỷ lệ nợ xấu bạn nhập vào đang đẹp hơn thực tế.

## Một lưu ý về việc tự nhập tay

Việc phải tự đi tìm và tự gõ từng con số **là chủ ý**, không phải hạn chế kỹ thuật.

Nếu app tự kéo số về, bạn sẽ nhập một mã rồi đọc điểm — và bạn học được đúng bằng không.
Khi phải tự mở báo cáo tài chính ra tìm vốn chủ sở hữu nằm ở dòng nào, bạn buộc phải chạm
vào con số thật. Đó là khác biệt giữa *dùng một công cụ* và *hiểu một doanh nghiệp* — và
bài học đầu tư số 1 trong cẩm nang nói bạn chỉ nên đầu tư vào thứ mình hiểu rõ.

Ngoài ra: app không gửi gì lên mạng. Không có kết nối ra ngoài thì không có gì rời khỏi
máy bạn.
