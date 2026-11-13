# Spec FE — Khám lâm sàng và bệnh án SOAP

## Hợp đồng đang dùng

| Hành động    | Endpoint (prefix `/api/medical-records`) | Kỳ vọng FE                                                                                                                                                         |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bắt đầu khám | `POST /service/:id/start`                | Bác sĩ được giao ca; `Waiting → InProgress`; BE tạo nháp và nhả chuồng chờ. Hiển thị lỗi BE nếu bị chặn bởi check-in/thứ tự.                                       |
| Lưu nháp     | `PUT /service/:id`                       | Gửi SOAP, ghi chú, cân nặng hợp lệ và đơn thuốc. Giữ dữ liệu và chỉ rõ lỗi field nếu BE từ chối. Giữ nguồn thuốc Medicine/Active và hỗ trợ vaccine Active hiện có. |
| Hoàn tất     | `POST /service/:id/complete`             | Chặn nếu thiếu S/O/A/P. Một request gửi form hiện tại, gồm `waitingCageId` là ID hoặc `null`. Sau thành công dùng trạng thái dịch vụ/đơn và cân nặng từ response.  |
| Chi tiết     | `GET /service/:id`                       | `Finalized` là chỉ đọc, dùng bản BE đã lưu. Quyền truy cập do BE kiểm soát.                                                                                        |
| Tiền sử      | `GET /pet/:petId`                        | Drawer đọc `records` trả về, mới nhất trước theo BE; không thay đổi quyền.                                                                                         |

**Chênh lệch tài liệu:** tab review mô tả hoàn tất khám là khóa ngay. BE tại `b91275b` chuyển dịch vụ sang `Done` nhưng giữ bệnh án `Draft` đến khi thanh toán (BR-14). FE hiển thị theo status thật: `Done` ẩn nút hoàn tất, `Draft` còn lưu được, `Finalized` không cho sửa. Muốn khóa ngay khi khám xong cần đổi nghiệp vụ BE, ngoài scope FE.

## Tiêu chí nghiệm thu

- Lỗi 400 hiển thị ở ô tương ứng hoặc trong thông báo chung. Lỗi 403/404/409 kiểm tra lại trạng thái ở nền: nếu ca còn sửa được, giữ nguyên nội dung nhập và thông báo lỗi; chỉ ẩn form nếu BE xác nhận không còn quyền sửa hoặc hồ sơ đã khóa.
- Xung đột do cận lâm sàng/chuồng không gửi lại tự động; bác sĩ thấy lỗi, sửa/chọn lại rồi xác nhận thủ công.
- Chỉ chuồng `Available` được đưa vào dropdown. Chuồng không đủ tải không chọn được. Nếu tải danh sách lỗi, phân biệt với danh sách trống và cho tải lại hoặc hoàn tất không chuồng.
- Hoàn tất thành công cập nhật header từ response: `WaitOwner` nếu mọi dịch vụ đã xong, `InProgress` nếu còn dịch vụ. Hiển thị bản lưu từ BE khi record `Finalized`.
- Không trộn form giữa hai ca nếu URL đổi. Không gửi trùng lưu/hoàn tất trong khi request trước đang chạy.

## Kiểm thử

- Unit: payload SOAP khi hoàn tất có/không chọn chuồng; không lẫn chuồng vào PUT.
- Browser/API mock: chặn thiếu SOAP, 409 do cận lâm sàng giữ draft, 400 map lỗi field, chọn lại chuồng, completion Done/Draft, Finalized chỉ đọc, drawer tiền sử. Không thay thế kiểm thử tích hợp với BE thật.
