# Đặc tả FE — phản hồi tiếp nhận lễ tân (12/11/2026)

## 1. Danh sách lịch hẹn

- Lễ tân: truy vấn ban đầu `GET /appointment-orders?from=YYYY-MM-DD&to=YYYY-MM-DD`, hai giá trị là cùng một ngày theo `Asia/Ho_Chi_Minh` khi mở màn.
- Đổi ngày hoặc xóa ngày đều quay về trang 1. Xóa ngày bỏ cả hai tham số; “Đặt lại” về mặc định của vai trò. “Làm mới” giữ bộ lọc hiện tại.
- Admin giữ bộ lọc khoảng ngày và không tự lọc hôm nay. Làm mới chi tiết theo mã không phụ thuộc ngày đang lọc.

## 2. Badge phân chuồng

- Lễ tân tải một danh sách `GET /cage-assignments?active=true`; badge hiển thị bên cạnh trạng thái hẹn, không thay `derivedStatus`. Chỉ lấy `orderId` dạng chuỗi hoặc `orderId._id` với `releasedAt` rỗng theo hợp đồng (`null` hoặc không có).
- Hiện ngay theo response phân chuồng hoặc walk-in thành công rồi đối chiếu lại với server. Check-in và làm mới danh sách cũng đối chiếu lại. Không lấy trạng thái theo danh sách lịch cũ hay bộ lọc của tab quản lý chuồng.
- Khi trình duyệt quay lại màn danh sách và mỗi 30 giây khi tab đang hiển thị, tải lại để phản ánh giải phóng ở màn bác sĩ/groomer. GET mới sau mutation hủy GET đang chạy; request bị hủy không được ghi state. Lỗi GET ẩn badge chưa xác nhận, báo tình trạng chưa xác định và cho thử lại mà không chặn bảng lịch.

## 3. Phiếu triệu chứng và tình trạng ban đầu — chờ BE

- Hợp đồng đề xuất: `PATCH /appointment-orders/:id/check-in` gửi `{ intake: { symptoms, initialCondition } }`; response và `GET /appointment-orders` trả `intake` nếu đã ghi nhận. BE phải validate và lưu phiếu trước khi báo check-in thành công.
- Phiếu là dữ liệu tiếp nhận, không phải SOAP. Hai trường không được chỉ chứa khoảng trắng; FE giới hạn 500 ký tự mỗi trường. Giữ input khi BE trả lỗi sửa được, không lưu phiếu giả trong trình duyệt. Nếu PATCH trả thành công nhưng không có phiếu hợp lệ, báo chưa xác nhận lưu phiếu và tải lại danh sách. Cần đồng bộ giới hạn với BE và chốt chính sách walk-in trước khi bật; PR này chỉ thêm phiếu vào thao tác check-in lịch hẹn.
- `VITE_ENABLE_RECEPTION_INTAKE` mặc định tắt: giữ check-in hiện tại khi BE chưa nhận/lưu/trả phiếu.

## 4. Phân công theo chuyên môn — chờ BE

- Đề xuất `GET /users/staff` trả `specialty` cho bác sĩ. Sau khi phiếu đã được lưu, Lễ tân chọn chuyên môn cho ca dựa trên phiếu, rồi chọn bác sĩ hoạt động khớp chuyên môn. FE không tự suy chuyên môn từ tên hay nhóm dịch vụ. Grooming vẫn theo luồng Groomer.
- FE tái sử dụng `PATCH /appointment-services/:id/assign-staff` với `assignedStaffId`. Trước khi bật production, BE cần hợp đồng để biết chuyên môn yêu cầu của ca, xác thực người nhận phù hợp và chịu trách nhiệm trạng thái hàng đợi. Khi không có bác sĩ phù hợp, báo rõ thay vì lùi về người sai chuyên môn.
- Không bật luồng phụ thuộc dữ liệu chuyên môn trên BE hiện tại; dùng cấu hình mặc định tắt cho phần tích hợp chờ hợp đồng.
