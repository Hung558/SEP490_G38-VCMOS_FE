# Kế hoạch — tương thích phiếu tiếp nhận PR BE #40

- Cơ sở: FE `a8ab3d9`; hợp đồng BE `e44f949` (PR #40). Không triển khai PR #41 hoặc sửa StaffQueue.
- Tách cờ phân công theo chuyên môn khỏi cờ ghi phiếu; giữ mặc định tắt. Dùng lại chuẩn hóa/giới hạn check-in cho walk-in và ánh xạ lỗi của BE.
- Hiển thị phiếu đã lưu trong chi tiết lịch hẹn và màn khám của bác sĩ, tách khỏi ghi chú và SOAP.
- Kiểm tra unit, lint, build và desktop Playwright với API giả lập trên Vite `127.0.0.1:3186`: cờ tắt/bật, check-in cũ/mới, walk-in với khách/thú cưng cũ hoặc mới, lỗi API, đọc phiếu của bác sĩ và phân công khi chưa có dữ liệu chuyên môn.

## Chạy lại QA

Chạy `npm test`, `npm run lint`, `npm run build`. Khởi động Vite với `VITE_API_ROOT=/api` trên `127.0.0.1:3186`; đặt `VCMOS_QA_BASE=http://127.0.0.1:3186` và `VCMOS_QA_INTAKE=on` hoặc `off` khớp cờ ghi phiếu. Khởi động lại Vite khi đổi cờ.

| Cờ intake / specialty | Bộ desktop Playwright                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `true` / `false`      | `python tests/verify_intake_contract_e2e.py`                                                  |
| `false` / `false`     | `python tests/verify_intake_contract_e2e.py` và `python tests/verify_reception_intake_e2e.py` |
| `true` / `true`       | `python tests/verify_reception_intake_e2e.py` (fixture có chuyên môn)                         |
