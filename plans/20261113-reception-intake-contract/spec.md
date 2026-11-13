# Đặc tả — phiếu tiếp nhận

| Luồng                            | `VITE_ENABLE_RECEPTION_INTAKE=false` (mặc định)           | `true`                                                                                               |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Check-in lịch có sẵn             | Không gửi `intake`; giữ thao tác xác nhận cũ.             | Bắt buộc đủ hai trường khi xác nhận.                                                                 |
| Walk-in                          | Không có ô nhập phiếu; không gửi `intake`.                | Cho phép chọn “Ghi phiếu tiếp nhận” trong mọi chế độ khách/thú cưng. Không chọn thì bỏ hẳn `intake`. |
| Chi tiết lịch và màn khám bác sĩ | Phiếu đã lưu vẫn đọc được; lịch cũ không hiện phiếu rỗng. | Tương tự; chi tiết lịch có trạng thái chưa lưu, màn khám không thêm phiếu rỗng.                      |

- Khi gửi, `intake` chỉ chứa `symptoms` và `initialCondition`: mỗi trường bắt buộc, bỏ khoảng trắng đầu/cuối, tối đa 500 ký tự. Không ghi đè `note`, không điền vào SOAP. Với walk-in, đổi kết quả tra cứu hoặc thú cưng phải xóa phiếu đang nhập; lỗi `intake.<field>` hiển thị cạnh trường, lỗi `intake` hiển thị ở thông báo chung.
- Walk-in thành công nhưng phản hồi không xác nhận đã lưu phiếu: báo đã tạo lịch nhưng chưa xác nhận lưu phiếu; vẫn đóng form và tải lại để tránh tạo trùng.
- Màn khám chỉ dành cho bác sĩ: lấy phiếu từ lịch trong bệnh án, nếu thiếu thì đọc từ lịch trong hàng đợi. Không thêm phiếu vào màn hồ sơ của chủ nuôi.
- `VITE_ENABLE_RECEPTION_SPECIALTY_ROUTING` là cờ riêng, mặc định tắt; cần bật cả hai cờ để chạy kiểm tra khớp chuyên môn. PR #40 chưa cung cấp chuyên môn, do đó chỉ bật cờ phiếu khi rollout trên hợp đồng này; không đoán chuyên môn hay tự lùi về bác sĩ sai chuyên môn nếu đã bật cờ.

## Ngoài phạm vi

- `GET /pets/:petId` bổ sung `appointmentNotes` gồm `note` và `intake`. FE chưa có màn hồ sơ thú cưng dành cho nhân viên để hiển thị lịch sử này; không hiển thị trong trang chủ nuôi hoặc màn lịch sử bệnh dùng chung. Cần chốt quyền đọc trường này trước khi làm giao diện lịch sử.
- Không thay đổi luồng xếp chuồng, chỉ định cách ly, form SOAP, luồng đặt lịch online hay StaffQueue.
