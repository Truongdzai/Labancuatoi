/* Luồng phụ chạy mô hình ngôn ngữ — La Bàn Tự Do Tài Chính
   ============================================================

   VÌ SAO PHẢI CÓ TỆP NÀY

   Bản đầu gọi CreateMLCEngine() thẳng trên luồng chính. Nó chạy đúng, nhưng đo
   thực tế thì suốt lúc mô hình sinh chữ, cả tab đứng hình: cuộn không được, bấm
   không được, đồng hồ trong trang cũng gần như không nhích. Với một đoạn ba câu
   thì việc đó kéo dài hàng chục giây — trên điện thoại còn lâu hơn.

   WebGPU đẩy phép tính xuống card đồ hoạ, nhưng phần điều phối và mã hoá chữ vẫn
   nằm trên luồng gọi nó. Nên lời giải là chuyển toàn bộ động cơ sang một luồng
   phụ: WebWorkerMLCEngineHandler nhận lệnh từ trang qua postMessage, chạy ở đây,
   rồi trả kết quả về. Luồng chính rảnh tay, giao diện mượt như thường.

   Tệp này cố tình mỏng — mọi logic nằm ở index.html. Nó chỉ là cái cầu.

   Lưu ý: đây là module worker (type:"module") nên phải phục vụ qua http/https.
   Mở app bằng file:// thì worker không tạo được — index.html đã kiểm tra trước
   và khi đó chỉ dùng bộ luật nội bộ, không mời người dùng bật mô hình. */

import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/lib/index.js";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg) => {
  try {
    handler.onmessage(msg);
  } catch (e) {
    /* Động cơ hỏng thì báo về trang rồi thôi; trang tự quay lại bộ luật nội bộ.
       Tuyệt đối không để lỗi ở đây làm chết cả worker một cách âm thầm. */
    try { self.postMessage({ kind: "loi", chiTiet: String(e && e.message || e) }); } catch (_) { }
  }
};
