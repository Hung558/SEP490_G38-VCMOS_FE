# Kế hoạch: đồng bộ FE với BE PR #42

- Cơ sở: FE `d5c431a`, BE `a2535bb` (PR #42). Nhánh `feat/be42-workflow-alignment` → PR vào `main`; repo không có `origin/dev`.
- Đối chiếu request check-in/walk-in, phân công, hàng đợi, SOAP, đặt lịch và xóa hồ sơ thú cưng với mã BE.
- Tích hợp riêng luồng lễ tân, lượt dịch vụ/chuồng và thông báo xóa hồ sơ. Không sửa BE, mobile hay tái làm tổng quan hôm nay đã có từ FE #33.
- Unit, lint, build, Playwright desktop (API giả lập), kiểm tra diff rồi push và thử merge qua quy định nhánh.
