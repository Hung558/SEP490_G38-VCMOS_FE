# Kế hoạch FE — Quy trình spa theo BE PR #39

**Nguồn:** `SEP490_G38-VCMOS_BE` PR #39, merge `67445fb`; FE base `69a6795`. Chỉ FE desktop, không sửa BE hoặc luồng SOAP.

1. Đối chiếu routes, validators, service và tài liệu BE; ghi rõ trạng thái và payload trong spec.
2. Thêm service calls và validation, nối hành động vào hàng đợi Groomer hiện có; xem chi tiết và lịch sử ghi chú.
3. Chạy unit/lint/build và Playwright desktop cổng 3000 với lỗi/đua trạng thái; smoke với BE thật và Mongo cô lập, dùng stub cho Cloudinary nếu không có môi trường test riêng.
4. Tạo feature PR vào `main`, gắn test evidence, xin review và merge khi được phép. Sau đó cải thiện UX lễ tân trong PR độc lập.

Rollback: revert PR FE; không tạo migration, ghi chú đã lưu trên BE vẫn giữ nguyên.
