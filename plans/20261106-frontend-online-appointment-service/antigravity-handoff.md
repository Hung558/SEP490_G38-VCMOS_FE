# AntigravityIDE handoff — FE thêm dịch vụ vào lịch hẹn online

Repo: `SEP490_G38-VCMOS_FE`

Đây là task implementation dựa trên BE contract mới. Đọc trước khi code:

- `plans/20261106-frontend-online-appointment-service/spec.md`
- `plans/20261106-frontend-online-appointment-service/plan.md`
- `ai_coding_rule.md`
- `src/services/01_axios/`
- `src/constants/roles.ts`
- `src/services/AppointmentOrderService/`
- `src/services/ServiceService/`
- `src/pages/Dashboard/`
- `SEP490_G38-VCMOS_BE/api/appointment-services/create-online-appointment-service.md`

## BE contract — giữ nguyên

- `POST /api/appointment-services/online`
- Chỉ `PetOwner` được gọi.
- Chỉ được thêm vào lịch hẹn online thuộc owner đang đăng nhập.
- Body whitelist:
  ```json
  {
    "orderId": "...",
    "serviceId": "...",
    "sequenceNo": 1,
    "isEmergency": false
  }
  ```
- `sequenceNo` và `isEmergency` là optional.
- Không gửi `ownerId`, `preferredStaffId`, `assignedStaffId`, `status`, `queueNo`, `enqueueAt`, `dequeueAt`, `groomingNote`.
- Service phải `Active`.
- Order không được `Done`, `Cancelled`, `Overdue` và phải là online.
- BE tự lấy owner từ token và tự sinh sequence khi bỏ qua `sequenceNo`.

## Required implementation

1. Tạo typed service method cho `/appointment-services/online`, dùng relative path không có `/api`.
2. Thêm type/helper để trim, validate và whitelist payload.
3. Tích hợp UI vào owner Dashboard appointment flow, không tạo staff flow mới.
4. Chỉ hiện action `Thêm dịch vụ` cho appointment online hợp lệ của PetOwner.
5. Load danh sách service qua `ServiceService.listServices({ status: 'Active' })`; không cho chọn service Inactive.
6. Form hiển thị appointment summary, service selector, price/category/duration, optional emergency và optional sequence nếu cần.
7. Disable submit khi đang gửi; chống double submit.
8. Xử lý success, 400, 401, 403, 404, 409; giữ selections khi conflict có thể sửa.
9. Refresh selected appointment/list sau success nhưng không phá page/filter hiện tại.
10. Dùng AbortController/request sequence cho read requests; bỏ qua cancellation/stale responses.
11. Không thêm update/delete/reorder/queue/staff-assignment/grooming-note controls vì BE chưa hỗ trợ.
12. Không sửa BE, auth middleware, global Axios interceptor, Admin service management hoặc staff reception/cage behavior.
13. Tuân thủ AntD trực tiếp, styled-components, domain services và page component-folder rule; không thêm dependency.

## Important product limitation

BE hiện chỉ có create endpoint cho appointment-service; các API owner appointment detail không document mảng `appointmentServices`. Không được giả vờ hiển thị danh sách service đã thêm nếu response không có dữ liệu. Sau success có thể dùng response để xác nhận và refresh order detail/list, đồng thời ghi rõ limitation nếu chưa có endpoint list/detail.

## Verification

Chạy và báo đúng kết quả:

- `npm test`
- `npm run check-types`
- `npm run lint`
- `npm run build`

Nếu có browser/backend data, kiểm tra:

- PetOwner thêm service thành công cho lịch online của họ.
- Service Inactive không xuất hiện.
- Payload không có forbidden fields.
- Sequence duplicate trả 409 và form không mất dữ liệu.
- Guest/non-PetOwner không thấy hoặc không gọi được mutation.
- Existing booking/history/dashboard vẫn hoạt động.
- Responsive 375px, 768px và desktop.

Không claim browser/network verification nếu thiếu backend hoặc credentials.
