# Ghi chú để dán vào bảng review (2.1 + 2.2)

Ảnh chụp desktop từ FE build thật, với API fixture cô lập và tên minh họa tự nhiên; không phải dữ liệu bệnh nhân thật và không ghi vào BE.

| Mục / Khu vực               | Vấn đề trước sửa                                                        | Nội dung đã sửa                                                                                                                                                                    | Ảnh tương ứng                      |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 2.1 – Thông tin tài khoản   | Tiêu đề / nội dung mở đầu lặp lại                                       | Giữ một tiêu đề chính “Thông tin tài khoản”; bỏ phụ đề hồ sơ theo vai trò; giữ nguyên thông tin tài khoản, section theo vai trò, chỉnh sửa, xác thực email và đổi mật khẩu qua OTP | feedback-2-1-account.png           |
| 2.2 – Hồ sơ thú cưng        | Tên Breed dư thừa; timeline dài ngay trong hồ sơ; số liệu khó phân biệt | Nhãn “Giống loài”; chỉ giữ tổng quan sáu chỉ số có màu rõ và nút “Xem hành trình của bé”; giữ các thao tác sửa / xóa / chia sẻ / đặt lịch                                          | feedback-2-2-pet-profile.png       |
| 2.2 – Điều hướng hành trình | Chưa có màn hình riêng để chọn thú cưng                                 | Thêm menu “Hành trình của bé”, danh sách /pet-journeys và trang /pet-journeys/:petId; có phân trang, trạng thái rỗng/lỗi/thử lại, vẫn xem được thú cưng đã lưu trữ                 | feedback-2-2-journey-list.png      |
| 2.2 – Timeline thu gọn      | Mọi lịch hẹn xổ chi tiết, kích thước không đồng đều, tag tiếng Anh      | Mỗi mốc mặc định thu gọn theo ngày / loại dịch vụ / trạng thái / mã lịch; nhấn mở chi tiết; Việt hóa nhóm mốc và trạng thái, thống nhất cỡ chữ và đường viền                       | feedback-2-2-journey-collapsed.png |
| 2.2 – Chi tiết mốc          | Quá nhiều thông tin và lời hướng dẫn dư thừa                            | Chi tiết SOAP, chăm sóc, cận lâm sàng, nội trú và hóa đơn nằm sau thao tác mở mốc; bỏ mô tả dài và hướng dẫn thanh toán tại quầy đã được chỉ định bỏ                               | feedback-2-2-journey-expanded.png  |

## Hành vi cập nhật dữ liệu

Timeline vẫn cập nhật nền mỗi 30 giây khi có ca đang xử lý, nhưng không thay nội dung bằng skeleton và không đóng phần đang đọc. Lỗi mạng giữ lại dữ liệu thành công gần nhất kèm cảnh báo; lỗi quyền 401/403/404 xóa dữ liệu cũ. Bộ lọc/phân trang vẫn gọi API. Hồ sơ thú cưng chỉ tải tổng quan, không tự polling; có ghi rõ “Số liệu tại lần tải gần nhất” và nút “Làm mới số liệu” để chủ động cập nhật mà không tải lại trang.

## Phạm vi

Chỉ FE, mục 2.1 và 2.2; không thay API/BE, không làm giao diện mobile. Bác sĩ và groomer chỉ xem hành trình từng bé, không có danh sách thú cưng của chủ nuôi và không hiển thị hóa đơn. Đường dẫn cũ /pets/:petId#inpatient-logs được chuyển tiếp sang màn hình mới.

## Vấn đề ngoài phạm vi còn tồn tại

Khi chạy thêm suite nội trú, ca kiểm thử có sẵn trên main “admission_refresh_invalidates_selected_cage_without_losing_clinical_inputs” thất bại: modal nhập viện không có nút “Làm mới” khi đã có chuồng phù hợp. AdmissionModal.tsx không thay đổi trong nhánh này. Giữ nguyên test, không nới assertion hoặc báo toàn bộ suite xanh. Cần task riêng cho modal nhập viện, không đưa vào hai mục profile/journey.

## Google Docs

Chưa chèn vào tài liệu: Google Drive/Docs chưa kết nối trong phiên. Có thể dùng ảnh trong tests/screenshots/ và nội dung bảng trên để dán vào cột Ảnh và ghi chú của tài liệu.

## Kết quả kiểm thử

Build/TypeScript và lint đạt; unit: 350 pass, 1 skip có sẵn. Browser trong phạm vi: 19 ca pass (3 profile, 13 journey, 3 hồi quy liên quan). Có kiểm tra sửa hồ sơ, OTP email/mật khẩu, phân quyền 5 vai trò, không lộ tài chính cho bác sĩ/groomer, đổi thú cưng, bộ lọc/phân trang, lỗi/thử lại và làm mới nền. Toàn bộ dùng API fixture, không xác nhận OTP thật hoặc API production.
