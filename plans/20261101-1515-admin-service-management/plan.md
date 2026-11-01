---
title: Frontend Admin Service Management
status: pending
created: 2026-11-01
---

# Plan — FE quản lý dịch vụ cho Admin

## 1. Mục tiêu và baseline

Xây dựng giao diện quản trị danh mục dịch vụ dựa trên tính năng BE mới nhất trong checkout, không suy diễn thành luồng đặt lịch/thanh toán.

- BE: `a35fdc969562e46f928ea8531388b8176bee5d7c`, merge ngày 31/10/2026 18:34 +07; commit tính năng `2778140` — `Admin Feature/ Service Management`.
- FE: `7628bc7e5ee72491f234beb0ac1d934e79b70cb5`.
- Khảo sát ngày 01/11/2026; cả hai repo sạch trước khảo sát. Chưa fetch remote, nên “mới nhất” là HEAD/ref có sẵn local, không phải xác nhận trạng thái GitHub thời gian thực.
- Đây là bàn giao kế hoạch, **chưa triển khai FE, chưa kiểm thử runtime**. Các checkbox implementation giữ nguyên chưa hoàn thành.

## 2. Tài liệu triển khai

- [Spec sản phẩm, API và UX](spec.md).
- [Phase 01 — Contract, service và routing](phase-01-contract-and-routing.md).
- [Phase 02 — Giao diện và tương tác](phase-02-ui-and-workflows.md).
- [Phase 03 — Kiểm thử và nghiệm thu](phase-03-verification.md).

Đọc spec trước khi code. Không dùng kế hoạch quản lý tài khoản cũ ở workspace để suy ra contract dịch vụ.

## 3. Ràng buộc

- Tuân thủ `ai_coding_rule.md`: Ant Design trực tiếp, styled-components, domain service có `urls.ts` + `index.ts`; không gọi axios/fetch trực tiếp trong UI.
- Page root chỉ chứa `index.tsx`; component, style, hook/helper cục bộ nằm trong `components/`.
- Tái sử dụng auth/layout/guard hiện có; không viết lại auth hoặc đổi contract backend.
- Không thêm thư viện state/data-fetching/test mới chỉ để làm tính năng này.
- Không commit, push hoặc publish tài liệu trong bước khảo sát này.

## 4. Ngoài phạm vi

Booking/appointment, order/invoice/payment, ảnh dịch vụ/upload, quản lý category động, bulk action, export, hard delete, sửa backend và refactor toàn app.

## 5. Thứ tự thực hiện

1. Khóa types và payload theo contract đã khảo sát; bổ sung domain service.
2. Nối route/menu/breadcrumb Admin, dùng guard sẵn có.
3. Làm list/filter/search rồi detail, create/edit và đổi status; không có thao tác xóa vì BE cấm DELETE.
4. Kiểm tra race conditions, lỗi field, quyền truy cập, dữ liệu sau mutation.
5. Chạy unit/static/build, sau đó browser smoke với backend và tài khoản test được phép.
6. Review diff theo spec, ghi rõ acceptance nào đã/ chưa có bằng chứng.

## 6. Definition of done

- [ ] Hoàn thành toàn bộ acceptance criteria trong spec và phase verification.
- [ ] Không có thay đổi ngoài phạm vi hoặc regression ở quản lý tài khoản, auth, sidebar.
- [ ] API payload/response được kiểm tra bằng dữ liệu BE thực, không chỉ mock.
- [ ] Chứng minh UI/interaction bằng browser preview; không coi build pass là bằng chứng tích hợp.
- [ ] Report rõ mọi giới hạn backend còn tồn tại; không tuyên bố đã sửa backend.

## 7. Tooling khi lập tài liệu

CLI `ak` không có trong PATH (`ak: command not found`), nên không thể resolve/index plan hoặc tạo automatic journal qua CLI. Plan được lưu trực tiếp dưới `plans/` làm nguồn bàn giao; không có journal nào được tạo và không publish AgentWiki.
