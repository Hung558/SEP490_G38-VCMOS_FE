# Plan FE — Feedback SOAP ngày 10/11/2026

Nguồn: bản lưu tab `t.en524rukmnnz` (“10/11/2026 - api mới”). Baseline: FE `c0fa77c`, BE đối chiếu `b91275b`. Xem [spec](spec.md).

1. Đối chiếu năm endpoint medical-records và quyền/response với BE. Tái sử dụng queue, API service, form và history hiện tại; không làm lại các tab feedback khác.
2. Sửa luồng lỗi lưu/hoàn tất: map lỗi field, đối chiếu trạng thái mà không remount form, chỉ khóa khi BE trả `Finalized`. Cập nhật header từ response hoàn tất.
3. Làm rõ luồng chuồng tùy chọn: chỉ hiển thị chuồng Available, bỏ response cũ, có nút tải lại khi lỗi và gửi `null` nếu không chọn. Chặn gửi lặp.
4. Test helper payload và chạy E2E với API mock cho validation, save, conflict/retry, trạng thái Done/Draft/Finalized và lịch sử. Chạy unit, lint, production build.

Không thay đổi BE, nghiệp vụ hóa đơn, walk-in, booking hoặc dependency của ứng dụng.

## Kết quả kiểm thử

- `npm test`: 146/146 pass.
- `npm run lint`: pass.
- `npm run build`: pass, gồm TypeScript (`tsc -b`) và Vite production build.
- `tests/verify_soap_feedback_e2e.py`: 3/3 pass với Chrome và API mock; chưa chạy trên backend/DB thật.

Chạy lại E2E: dùng Python có Playwright và browser Chromium (hoặc `PLAYWRIGHT_CHANNEL=chrome` nếu dùng Chrome đã cài). Khởi động Vite với `VITE_API_ROOT=/api`, đặt `FE_BASE_URL` theo địa chỉ Vite, rồi chạy `python tests/verify_soap_feedback_e2e.py`.
