# Phase 02 — UI và workflows

## Cấu trúc đề xuất

```text
src/pages/AdminServices/
  index.tsx
  components/
    ServiceFilters.tsx
    ServiceTable.tsx
    ServiceFormModal.tsx
    ServiceDetailModal.tsx
    serviceOptions.ts
    serviceForm.ts
    useServiceManagement.ts
```

Tên file là đề xuất, có thể gộp component rất nhỏ nếu dễ đọc; bắt buộc giữ page root chỉ `index.tsx`. `useServiceManagement` sở hữu state/fetch/mutation để page không thành khối quá lớn. Options/constants và pure payload/validation helpers tách để runner Node test được. Không tạo generic Input/Button/Table wrapper.

## Tham chiếu conventions

- `src/pages/AdminUsers/index.tsx`: AntD table/filter + sonner + service.
- `src/pages/AdminUsers/components/UserFormModal.tsx`, `UserDetailModal.tsx`: modal theo mode và detail.
- Không copy fallback `response.data.users` hay request-per-keystroke mù quáng; service feature này đọc response body đã unwrap và search theo submit.
- Dùng AntD trực tiếp; styled-components cục bộ nếu cần, không style global làm ảnh hưởng AdminUsers.

## Checklist UI

- [ ] Header và toolbar tiếng Việt theo spec; create/refresh actions.
- [ ] Tách `searchDraft` và `searchApplied`; submit Enter/nút, clear áp dụng từ khóa rỗng. Filter đổi dùng searchApplied.
- [ ] Category/status options type-safe, labels tiếng Việt, clearable; reset filters reset page.
- [ ] Bảng `_id` rowKey, columns code/name/category/duration/price/status/actions; thiếu numeric field hiển thị “—”, không giả là 0.
- [ ] Client pagination theo constants repo; không gửi page/limit lên BE.
- [ ] Loading/empty/filtered-empty/error/retry riêng; không nuốt lỗi thành danh sách rỗng.
- [ ] Detail modal GET riêng, skeleton/spinner, lỗi + retry, 404 rõ; không hiển thị response record A khi đang mở B.
- [ ] Create form defaults status Active; required fields không tự điền số thiếu bằng dữ liệu giả.
- [ ] Edit fetch latest detail trước hydrate form; code/status read-only, PUT omit status.
- [ ] Validate trim name 3–100, integer duration 5–480, finite price >=0, description <=500; payload whitelist.
- [ ] Description edit gửi `''` khi user xóa; không đổi thành undefined rồi vô tình giữ giá trị cũ.
- [ ] Field errors 400 và duplicate 409 hiển thị trong form, không mất input; lỗi khác một toast/alert dễ hiểu.
- [ ] Có confirm action Active/Inactive; row pending, giữ nguyên khi fail; không có delete/restore.
- [ ] Mobile toolbar wrap/modal vừa màn/table scroll; không thêm wrapper UI custom.

## Checklist orchestration

- [ ] List request có request id/cleanup hoặc cơ chế tương đương để bỏ response cũ, kể cả finally không tắt loading request mới.
- [ ] Detail request có id/cleanup riêng; close/reset tránh set lại dữ liệu cũ.
- [ ] Mutation khóa double-submit; không tự retry POST/PUT/PATCH; không optimistic status.
- [ ] Khi save pending, không đóng modal rồi quên kết quả request; có loading indicator rõ.
- [ ] Thành công mutation và thất bại refetch là hai trạng thái riêng: báo “Đã lưu nhưng chưa tải lại được”, không báo “Tạo thất bại” sau POST đã thành công.
- [ ] Refetch theo filters đang áp dụng; giữ/clamp page; nếu item rời filter sau đổi status thì biến mất đúng.
- [ ] Detail đang mở được refresh sau status/edit hoặc đóng có chủ đích; tránh stale status.
- [ ] Lỗi permission không lộ dữ liệu, không retry loop; không đổi global auth/interceptor chỉ để che lỗi.

## Exit criteria

Hoàn thành workflow list/detail/create/edit/status đúng spec; không có xóa và không làm thay đổi tính năng ngoài phạm vi. Chuyển sang [verification](phase-03-verification.md), không đánh dấu done chỉ vì UI đã render.
