# Kế hoạch FE — Tổng quan ca hôm nay cho lễ tân

## Mục tiêu

Trên màn Tiếp nhận hiện có, lễ tân nhìn nhanh số lịch hôm nay, biết ca nào đang chờ và có thao tác tiếp theo ngay trên mỗi dòng. Không tạo dashboard hoặc tuyến mới.

1. Đối chiếu API danh sách theo ngày, trạng thái và pagination, giữ BE nguyên trạng.
2. Thêm tổng quan hôm nay độc lập với filter của bảng; bấm số liệu để xem đúng nhóm và trang đầu. Dùng đúng ngày Việt Nam.
3. Làm rõ hành động tiếp theo trên dòng nhưng giữ các thao tác hiện có; không thay quy tắc check-in, hủy, phân công, phân chuồng hay feature flag intake.
4. Test unit mapping, Playwright desktop cổng 3000 (mock API) và chạy lại regression tiếp nhận. Tạo PR riêng, review rồi merge vào main theo ruleset, không ép merge.

Phạm vi: FE web desktop, Lễ tân, tab Danh sách lịch hẹn. Không đổi Admin, mobile hay BE. Làm sau khi luồng Groomer đã kiểm thử và lên PR; hai thay đổi không phụ thuộc mã nhau. Nếu cần rollback, revert PR này độc lập.
