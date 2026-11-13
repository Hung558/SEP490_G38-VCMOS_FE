# Đặc tả FE — Quy trình spa

## Quyền và trạng thái

- Dùng màn `/clinic/my-queue`. Chỉ Groomer có hành động spa; giữ SOAP của bác sĩ và nút xem chuồng. BE kiểm tra quyền và phân công; không gửi ID người thao tác trong payload.
- Ca `Booked` hoặc `Waiting` chưa tiếp nhận: hiển thị chờ check-in; `Waiting` đã tiếp nhận: **Bắt đầu spa** gọi `PATCH /appointment-services/:id/start`, không body. `InProgress`: **Hoàn thành spa** gọi `PATCH /appointment-services/:id/complete`, không body. Không bắt buộc có ghi chú để hoàn thành. Không thao tác hoàn thành nếu đơn `Done`, `Cancelled`, `Overdue`.
- Sau mutation tải lại hàng đợi. BE là nguồn duy nhất của trạng thái đơn: nếu tất cả dịch vụ không hủy đã `Done` và đơn đang `CheckedIn` hoặc `InProgress`, BE chuyển đơn sang `WaitOwner`. FE không tự thanh toán, trả thú, giải phóng chuồng hoặc cập nhật SOAP.

## Ghi chú và ảnh

- **Tạo ghi chú spa** trong `InProgress` hoặc `Done` nếu chưa có ghi chú. `POST /appointment-services/:id/grooming-note`: `beforeNote`, `afterNote`, `recommendations`, mỗi trường không quá 1000 ký tự sau trim; bỏ text rỗng. Có ít nhất một trường có nội dung hoặc ảnh hợp lệ.
- Chỉ text dùng JSON. Có ảnh dùng multipart với trường file `beforePhoto`/`afterPhoto`, tối đa một file mỗi trường, JPEG/PNG/WebP. Dùng giới hạn thực tế của middleware: ảnh nhỏ hơn 5 MiB vì Busboy báo lỗi khi chạm ngưỡng. Browser tự đặt multipart boundary. Không gửi URL ảnh làm input.
- Khi BE xác nhận tạo thành công (201), hiển thị ghi chú chỉ đọc. Chi tiết gọi `GET /appointment-services/:id/grooming-note`; lịch sử gọi `GET /appointment-services/my-grooming-notes`, giữ thứ tự mới nhất trước do BE trả. Không tạo tính năng chỉnh sửa, xóa hay công khai ảnh.
- Chống gửi trùng, có loading/trạng thái rỗng/lỗi. Lỗi upload giữ bản nháp để thử lại; lỗi 409 đối chiếu lại hàng đợi và đọc ghi chú đã tồn tại nếu có, không báo lưu thành công giả. Lỗi đọc có nút thử lại.

## Kiểm thử

- Playwright desktop: bắt đầu, hoàn thành có/không ghi chú, JSON, multipart, read-only, history, ảnh, 409/502, không lộ hành động Groomer với bác sĩ, giữ SOAP. Kiểm tra payload thực tế.
- Kiểm tích hợp tách biệt: đăng nhập, thay đổi trạng thái, ghi và đọc ghi chú sau tải lại, đơn chuyển WaitOwner khi ca cuối hoàn tất. Không dùng dữ liệu hay Cloudinary production.
