# Đặc tả FE — Cận lâm sàng và dịch vụ phụ

Nguồn: BE #41 (`19c89c9`), `api/BE_api.md` mục 11, routes, validator và service. Chỉ FE web desktop; không đổi API, quyền BE, tính phí hoặc luồng spa/SOAP.

- Bác sĩ phụ trách ca khám mở **Cận lâm sàng** ngay trong bệnh án hoặc từ hàng đợi. Theo dõi yêu cầu theo đúng ID dịch vụ (không theo ID lịch hẹn). Khi `InProgress` và chưa `Finalized`, tạo chỉ định với nhân sự `Active` thuộc `Veterinarian`/`Groomer`, tên 1–200 ký tự, hướng dẫn tùy chọn tối đa 2.000. Chỉ người tạo được hủy khi `Pending`, có xác nhận. Không xóa lạc quan.
- Bác sĩ và Groomer thấy tab **Việc được giao** tách khỏi hàng đợi chính. API lọc `Pending`, `InProgress`, `Completed` hoặc không lọc. Chỉ nhân sự được giao có nút bắt đầu (`Pending`) hoặc gửi kết quả (`Pending`/`InProgress`, cả hai được BE hỗ trợ). Không thay đổi dịch vụ chính khi thao tác tác vụ phụ.
- Kết quả phải có chữ (tối đa 3.000) và/hoặc một ảnh JPEG/PNG/WebP không rỗng, nhỏ hơn 5 MiB (Multer từ chối ngay khi chạm ngưỡng). Chỉ chữ: JSON `resultText`. Có ảnh: FormData `resultImage` và `resultText` nếu có chữ; không nhận URL do người dùng nhập. Danh sách và chi tiết hiển thị kết quả trả từ BE.
- Lễ tân, Admin và chủ nuôi có quyền xem bệnh án mở danh sách/chi tiết chỉ định ở chế độ đọc từ modal SOAP hiện có; không hiện nút tạo, hủy, bắt đầu hoặc hoàn tất. Gọi API dưới quyền phiên hiện tại, không suy ra quyền từ việc có ID.
- Xử lý tải/rỗng/lỗi/thử lại; chặn gửi lặp; giữ nội dung đang nhập khi mạng/upload lỗi. Sau xung đột trạng thái `403`/`404`/`409` cập nhật lại danh sách, không báo thành công giả. Luồng SOAP tiếp tục tôn trọng `MSG26` từ BE; chỉ định không làm mất bản nháp SOAP chưa lưu.
- Kiểm thử desktop dùng các vai trò riêng và dữ liệu giả lập, kiểm tra đúng body, kết quả, quyền, xung đột và hồi quy luồng cũ.
