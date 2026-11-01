# Phase 03 — Verification và nghiệm thu

## Phạm vi

Đây là checklist cho lúc triển khai, **không phải kết quả test đã chạy**. Chỉ thay đổi Markdown trong bước lập kế hoạch nên không khởi động dev server, không chạy app test/build để tuyên bố tính năng hoạt động.

## Static/unit checks

- [ ] Thêm test helpers/type mapping/payload vào `tests/*.test.mjs` theo runner Node hiện tại; không thêm framework chỉ cho feature.
- [ ] Test trim name, tên chỉ có khoảng trắng, giá 0/âm/không hữu hạn, duration 0/âm, category/status ngoài enum.
- [ ] Test payload không mang `_id`, audit fields hoặc field UI; create/update tách biệt.
- [ ] Test search/filter query bỏ giá trị rỗng, không gửi pagination/sort không được API hỗ trợ.
- [ ] Test phân trang client reset/clamp sau đổi filter hoặc đổi trạng thái làm item rời tập lọc.
- [ ] Test mapping field errors, unexpected response và lỗi không có response.
- [ ] Chạy `npm test`, `npm run lint`, `npm run build` tại repo FE.
- [ ] Có thể chạy `npm run typecheck` bổ sung, nhưng không dùng nó thay `npm run build`: root tsconfig có `files: []` và project references; script `tsc --noEmit` không chứng minh toàn bộ app đã được typecheck.

## Browser verification sau khi code

Dùng preview server qua `.claude/launch.json` và `preview_start`; workspace hiện có cấu hình `vcmos-fe-browser` tại `.claude/launch.json` của thư mục cha. Không sửa cấu hình nếu không cần.

1. Dùng tài khoản Admin test được cho phép và backend kết nối MongoDB; không đưa token/credentials vào tài liệu, screenshot hoặc commit.
2. Mở route trực tiếp, reload; kiểm tra auth hydration và guard.
3. Kiểm tra menu/breadcrumb/table qua snapshot; console/network không có lỗi mới.
4. Thử search/filter, empty, retry, detail, create/edit/status với **dữ liệu test**, không thao tác record nghiệp vụ thật.
5. Kiểm tra request/response qua network; đối chiếu spec.
6. Thử quyền staff/PetOwner và unauthenticated; menu không phải lớp bảo mật duy nhất.
7. Resize 375px/768px/desktop; kiểm tra toolbar/modal/table scroll và reset viewport desktop sau test.
8. Chụp screenshot trạng thái cuối và ghi bằng chứng network. Nếu không có tài khoản/BE, đánh dấu blocked; mock không thay được integration evidence.

## Acceptance checklist

- [ ] Admin thấy route/menu; người không có quyền không mount trang hoặc gọi API quản trị.
- [ ] List/search/filter/pagination client đúng, có loading/empty/error/retry và không bị response cũ ghi đè.
- [ ] Chi tiết dùng endpoint detail và xử lý record không còn tồn tại.
- [ ] Create/edit gửi đúng body, validation và errors hiển thị đúng; đóng/mở không giữ dữ liệu sai record.
- [ ] Mutation có pending state, chống double-submit, chỉ báo thành công sau response thành công.
- [ ] Đổi status có confirm, giữ trạng thái cũ nếu fail.
- [ ] Không có nút xóa, restore hay hàm gọi DELETE; BE luôn từ chối DELETE bằng 403. Ngừng cung cấp dịch vụ bằng PATCH status Inactive, không gọi đó là soft delete.
- [ ] Refetch giữ filter hiện tại, điều chỉnh page sau mutation; xử lý riêng lỗi refetch sau mutation đã thành công để không khuyến khích gửi POST lại.
- [ ] Không trùng toast giữa interceptor và page; không hiển thị HTML chưa sanitize.
- [ ] Không regression trang AdminUsers, login/logout, header/sidebar/breadcrumb.
- [ ] Không có API booking/payment/upload/category management được tự thêm.

## Review và bàn giao

- [ ] Review public contract, compatibility, security, race conditions và conventions repo.
- [ ] Ghi lệnh đã chạy, pass/fail thật; không đánh dấu checklist thiếu bằng chứng.
- [ ] Nếu source BE khác baseline thì cập nhật spec trước khi merge FE.
- [ ] Báo rõ giới hạn BE và mọi acceptance bị blocked; chỉ commit/push khi được yêu cầu.
