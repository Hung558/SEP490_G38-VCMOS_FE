# Kế hoạch FE — phản hồi tiếp nhận lễ tân (12/11/2026)

Base: `origin/main` (`c0fa77c`); không chỉnh BE, không gộp PR #30 vào nhánh này.

1. **Danh sách lịch hẹn:** mặc định ngày Việt Nam khi Lễ tân mở màn; kiểm tra đổi/xóa ngày và giữ cách lọc của Admin.
2. **Phân chuồng:** tải danh sách đang hiệu lực, đối chiếu theo mã đơn, đồng bộ khi phân chuồng, walk-in, check-in và khi chuồng được giải phóng.
3. **Phiếu tiếp nhận:** hợp nhất phần modal check-in do nhánh phụ trách; hai trường bắt buộc, độc lập với SOAP, chỉ bật khi BE hỗ trợ hợp đồng đã chốt.
4. **Chuyên môn:** hợp nhất phần lọc bác sĩ do nhánh phụ trách; không suy chuyên môn từ tên hoặc tự xác nhận ca đã chuyển nếu API thất bại.

Kiểm tra: unit helper, Playwright Chrome với API giả lập, lint, typecheck và production build. Sau khi BE hỗ trợ, chạy kiểm thử live cho phiếu tiếp nhận và chuyển ca trước khi bật flag.

## Kết quả kiểm thử

- `npm test`: 151/151; `npm run lint` và `npm run build` (gồm TypeScript) đều đạt.
- `tests/verify_reception_list_feedback_e2e.py`: 5/5 trên Chrome khi flag tắt.
- QA độc lập trên Chromium: `tests/verify_reception_intake_e2e.py` đạt 10/10 khi bật và 6/6 khi tắt (4 ca riêng của flag được bỏ qua). Cả hai bộ dùng API giả lập; chưa xác nhận lưu phiếu/chuyên môn với BE thật.

Chạy lại bộ QA độc lập: khởi động Vite trên một cổng rảnh `31xx` với `VITE_API_ROOT=/api`, `VITE_ENABLE_RECEPTION_INTAKE=true` và `VITE_ENABLE_RECEPTION_SPECIALTY_ROUTING=true` (hoặc đặt cả hai là `false`). Đặt `VCMOS_QA_BASE=http://127.0.0.1:<port>` và `VCMOS_QA_INTAKE=on` (hoặc `off` tương ứng), rồi chạy `python tests/verify_reception_intake_e2e.py`. Cờ phân công chuyên môn chỉ bật trong QA này vì fixture có `specialty`; xem đặc tả tương thích PR BE #40 trước khi rollout.
