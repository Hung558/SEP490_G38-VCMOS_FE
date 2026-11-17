# Chăm sóc nội trú — đồng bộ BE #46

- Nền: BE `b9d476a` (#46, 16/11/2026); FE `fc92ec5` (#39). Hai repo dùng `main` (không có `dev`). Chỉ sửa FE desktop.
- Hợp đồng: đối chiếu router/controller/service/validator với BE, rà lại các luồng #43–45 đã có trong FE #38–39.
- Bác sĩ: route + menu nội trú, danh sách/lọc/phân trang, chi tiết, ghi nhật ký, xuất viện; nhập viện từ ca khám đã xong và đơn chờ đón.
- Chủ nuôi: thay phần nội trú minh họa bằng điều hướng tới hồ sơ thú cưng, nhật ký thật theo quyền BE. Không suy đoán tình trạng đang nằm viện từ nhật ký.
- Kiểm thử: unit, lint, build, Playwright desktop API giả lập và kiểm tra hồi quy bị ảnh hưởng. Tách phần chủ nuôi và fixture QA để tích hợp, review; push feature branch, mở PR vào `main` và merge nếu quy định repo cho phép.

## Bằng chứng triển khai (17/11/2026)

- Hai phần bác sĩ/chủ nuôi đã tích hợp. Đã bỏ phần nội trú minh họa; không đưa việc phân chuồng về lại SOAP hoặc tự trả chuồng khi xuất viện.
- Unit 223/223; lint, kiểm tra kiểu trong build và production build đạt (Vite chỉ cảnh báo kích thước bundle). Playwright desktop API giả lập: nội trú 8/8, SOAP 3/3, lịch hôm nay 8/8. Fixture hồi quy đã được cập nhật theo FE #38–39, vốn đổi điều khiển check-in và đưa việc xếp chuồng chờ đón về lễ tân.
- Handoff trước khi demo: xác nhận trên môi trường thử nghiệm có chuồng `InpatientWard` trống và dữ liệu thật phù hợp; chưa kiểm thử browser với BE thật hoặc gửi email thật.
