# Tích hợp tác vụ phụ theo BE #41

- [x] Đối chiếu BE `19c89c9` và FE `a8ab3d9`; tách khỏi phiếu tiếp nhận BE #40.
- [x] Nối API, thêm quản lý chỉ định trong ca khám và tab việc được giao cho bác sĩ/Groomer.
- [x] Xem kết quả theo quyền, giữ dữ liệu SOAP và kiểm chứng chốt hoàn tất BE.
- [x] Unit, lint, build, E2E desktop và review.
- [ ] Merge khi nhánh `main` nhận đủ phê duyệt.

Kiểm chứng: 176 unit, 9 E2E tác vụ phụ, 1 E2E kiểm tra chốt SOAP, 7 hồi quy Groomer và 5 hồi quy danh sách/phân chuồng trên Chromium. BE #41/#40: 37 test API có MongoDB cục bộ riêng; dịch vụ tải ảnh được giả lập.
