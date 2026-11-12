# Kế hoạch FE — phản hồi tiếp nhận lễ tân (12/11/2026)

Base: `origin/main` (`c0fa77c`); không chỉnh BE, không gộp PR #30 vào nhánh này.

1. **Danh sách lịch hẹn:** mặc định ngày Việt Nam khi Lễ tân mở màn; kiểm tra đổi/xóa ngày và giữ cách lọc của Admin.
2. **Phân chuồng:** tải danh sách đang hiệu lực, đối chiếu theo mã đơn, đồng bộ khi phân chuồng, walk-in, check-in và khi chuồng được giải phóng.
3. **Phiếu tiếp nhận:** hợp nhất phần modal check-in do nhánh phụ trách; hai trường bắt buộc, độc lập với SOAP, chỉ bật khi BE hỗ trợ hợp đồng đã chốt.
4. **Chuyên môn:** hợp nhất phần lọc bác sĩ do nhánh phụ trách; không suy chuyên môn từ tên hoặc tự xác nhận ca đã chuyển nếu API thất bại.

Kiểm tra: unit helper, Playwright Chrome với API giả lập, lint, typecheck và production build. Sau khi BE hỗ trợ, chạy kiểm thử live cho phiếu tiếp nhận và chuyển ca trước khi bật flag.
