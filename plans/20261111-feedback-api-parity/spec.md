---
title: Close verified FE feedback and API parity gaps
status: completed
created: 2026-11-11
updated: 2026-11-11
repositories:
  frontend: SEP490_G38-VCMOS_FE
  backend: SEP490_G38-VCMOS_BE
---

# Spec: Các gap FE đã xác minh từ feedback 7-10/11

## 1. Mục tiêu

Đã xử lý trọn vẹn hai gap đã xác minh trong feedback tab 7/11/2026 và API BE:

1. **Đặt lịch online của PetOwner một form duy nhất (Đã hoàn thành - PR #25):**
   - Chuyển `QuickBookingSection` sang form một màn hình hiển thị đồng thời thú cưng, dịch vụ Active, ngày hẹn (giờ VN) và ghi chú triệu chứng.
   - Người dùng kiểm tra lỗi tại chỗ và xác nhận một lần.
   - Loại bỏ form đặt lịch khỏi landing page, chuyển hướng các CTA sang Dashboard.
   - Mở rộng cột Hành động trên bảng lịch hẹn Dashboard lên 240px kèm cuộn ngang 960px, khắc phục triệt để lỗi tràn chữ nút "Thêm dịch vụ".
2. **Lựa chọn chuồng chờ đón khi hoàn tất SOAP & Phân quyền chuồng (Đã hoàn thành - PR #26):**
   - Đã được gỡ blocker sau khi Backend merge PR #35 (`63f0bb2`): mở quyền `GET /api/cages`, `GET /api/cages/:id`, `POST /api/cage-assignments` cho `Veterinarian` và `Groomer`, đồng thời kiểm tra tải trọng chuồng theo cân nặng thú cưng (BR-11).
   - Front-end tích hợp dropdown chọn chuồng chờ đón (`waitingCageId`) trong modal hoàn tất ca khám SOAP, tự động tính toán cân nặng và vô hiệu hóa các chuồng quá tải kèm cảnh báo trực quan.
   - Mở nút "Chuồng" trên Hàng đợi khám (`StaffQueue`) cho Bác sĩ và Groomer để tra cứu và giải phóng chuồng.
   - Mở route `/cages` và menu điều hướng cho nhân sự lâm sàng.

## 2. Baseline và bằng chứng

Audit ngày 2026-11-11 trên các revision:

- FE `322019e784e3224a73b3dbbb816f7f829f2230ba`.
- BE `b3cd61c956af8dae70a2d2e524f6bfe4f6199c29`.
- Hai working tree sạch tại thời điểm audit.

Feedback đã kiểm tra theo tab:

- `7/11/2026`: Dashboard PetOwner cần tab quản lý thú cưng, lịch đặt và AI; booking chuyển khỏi landing vào tab lịch đặt; booking đổi từ wizard sang form đầy đủ và xác nhận một lần; owner xem được nhân sự được phân công.
- Tab con `Luồng FE khách vãng lai`: tiếp nhận walk-in.
- `10/11/2026 - api mới`: hợp đồng medical-record/SOAP, gồm hoàn tất khám với `waitingCageId` tùy chọn.
- Không có tab riêng ngày 8 hoặc 9/11 trong metadata tài liệu đã kiểm tra.

Nguồn FE/BE có thể đối chiếu:

- `src/pages/Dashboard/index.tsx`: ba tab PetOwner; booking mount trong tab lịch; owner appointment list và assigned staff.
- `src/pages/Dashboard/components/AppointmentDetailModal.tsx`: tên nhân sự được phân công trong chi tiết lịch.
- `src/pages/Home/index.tsx`: landing vẫn render `QuickBookingSection` và CTA cuộn tới form.
- `src/pages/Home/components/QuickBookingSection.tsx`: `Steps` bốn bước và conditional step content dù có prop `embedded`.
- `src/pages/ExamRecord/components/SoapForm.tsx`: form lưu nháp/hoàn tất SOAP, hiện không có field chuồng chờ đón.
- `src/types/api/medical-record.api.ts`: `CompleteMedicalRecordPayload.waitingCageId?: string` đã tồn tại.
- BE `src/routes/medicalRecord.routes.js`: complete là `POST /api/medical-records/service/:appointmentServiceId/complete`, Veterinarian-only.
- BE `src/services/medicalRecord.service.js`: khi có `waitingCageId`, tạo CageAssignment sau khi hoàn tất.

## 3. Coverage matrix

| Feedback/API capability                                 | BE contract/evidence                                                                                                                                | FE hiện tại                                                                                                  | Kết luận                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Dashboard có tab pets, appointments, AI                 | Feedback 7/11                                                                                                                                       | Ba tab có trong `Dashboard/index.tsx`; AI được gắn nhãn đang phát triển                                      | Đã đáp ứng cấu trúc tab; AI thật không được yêu cầu nếu chưa có API/đặc tả |
| Owner xem nhân sự được phân công                        | Owner appointment detail trả dịch vụ/nhân sự; appointment service API                                                                               | Dashboard tải chi tiết mỗi appointment để dựng tên nhân sự; detail modal cũng hiện nhân sự                   | Đã triển khai                                                              |
| Booking nằm trong Dashboard, không còn wizard ở landing | Combined booking `POST /api/appointment-services/online-booking`                                                                                    | Form chỉ mount trong Dashboard tab lịch hẹn; landing đã gỡ bỏ hoàn toàn form và CTA điều hướng vào Dashboard | Đã hoàn thành (PR #25)                                                     |
| Booking một form và xác nhận một lần                    | Combined booking nhận petId/date/note/services trong một request; validator BE                                                                      | `QuickBookingSection` đã chuyển sang form một màn hình, validate đồng thời tại chỗ và xác nhận một lần       | Đã hoàn thành (PR #25)                                                     |
| Walk-in customer lookup/intake                          | `GET /appointment-orders/walk-in/customer-lookup`; `POST /appointment-orders/walk-in` (Receptionist/Admin theo route); danh mục dịch vụ/staff/cages | `WalkInModal` gọi lookup, load catalog/staff/cage, build payload, xử lý response/lỗi                         | Đã có service và UI; không đưa vào backlog                                 |
| Check-in/lịch clinic                                    | `GET /appointment-orders`; `PATCH /appointment-orders/:id/check-in`                                                                                 | AppointmentOrderService có list/check-in; reception UI dùng các service này                                  | Đã tích hợp theo source audit; không đưa vào backlog                       |
| Cage assignment                                         | `POST/GET /cage-assignments`, detail/by-order/release                                                                                               | CageAssignmentService được gọi trong reception và queue; modal tạo/phân chuồng                               | Đã tích hợp theo source audit; không đưa vào backlog                       |
| Queue/start/SOAP/history                                | `GET /appointment-services/my-queue`; medical-record start/save/complete/detail/history; medicine catalog                                           | StaffQueue, ExamRecord, SoapForm, history drawer và MedicalRecordService đang gọi các API                    | Đã hoàn thành                                                              |
| Waiting cage at completion                              | BE PR #35: mở `GET /api/cages` cho Veterinarian & Groomer; complete nhận `waitingCageId` kiểm tra tải trọng (BR-11)                                 | `SoapForm` có dropdown chọn chuồng Available, tự động vô hiệu hóa chuồng quá tải, gửi `waitingCageId`        | Đã hoàn thành (PR #26)                                                     |

Đây là source/contract audit có phạm vi; không phải xác nhận mọi endpoint trong BE đều có UI và không thay thế runtime/E2E test.

## 4. Yêu cầu chức năng

### FR-1: Booking form một màn hình

- Hiển thị đồng thời lựa chọn thú cưng, danh sách dịch vụ Active, ngày, ghi chú và hành động xác nhận.
- Không yêu cầu Next/Back giữa các nhóm field; loại bỏ wizard `Steps` khỏi luồng PetOwner này.
- Validate tất cả trường tại chỗ trước khi gửi: pet hợp lệ, ngày hợp lệ theo giờ Việt Nam, ít nhất một dịch vụ, sequence/isEmergency hợp lệ nếu các field này được cung cấp, ghi chú theo giới hạn hiện hành.
- Field lỗi phải nhìn thấy và liên kết được với control tương ứng; việc có lỗi ở một field không làm mất dữ liệu các field khác.
- Một lần xác nhận gửi đúng một `POST /appointment-services/online-booking`; chặn double-submit.
- Giữ active catalog filtering, abort/stale-response guard và behavior error/retry hiện có.
- Giữ prefill `initialPetId`/`initialNote`, `onBooked`, `onViewAppointments`, `onAddPet` hoặc điều chỉnh callback tương thích mà không làm hỏng caller Dashboard.

### FR-2: Booking bắt đầu từ Dashboard

- Tab appointments là nơi duy nhất render form đặt lịch đầy đủ.
- CTA đặt lịch trên landing đưa PetOwner đã đăng nhập tới `/dashboard?tab=appointments&book=new` hoặc booking phù hợp petId; không cuộn xuống một bản booking khác trên landing.
- Guest vẫn đi qua login hiện hữu; sau login cần đi tiếp hợp lý tới booking nếu cơ chế continuation hiện tại cho phép, không tự tạo một auth flow mới.
- CTA chọn service/doctor từ landing được chuyển hướng tới Dashboard booking, giữ thông tin có thể tiền điền nếu component/API hiện tại hỗ trợ; không gửi dữ liệu nội bộ hoặc phát sinh booking tự động.
- Landing không render `QuickBookingSection` booking form sau khi migration; nội dung khác của landing giữ nguyên.

### FR-3: Chặn triển khai waiting-cage picker cho tới khi API được mở quyền

- Không thêm UI chọn chuồng cho Veterinarian trong khi API đọc danh sách cages từ chối role này.
- Ghi rõ BE prerequisite: cung cấp API catalog Available cages cho Veterinarian được phân công/đang khám, hoặc cập nhật authorization của GET `/api/cages` có review bảo mật và phạm vi dữ liệu phù hợp.
- Sau khi prerequisite được merge, mở rộng scope riêng để tải cages, chọn tùy chọn, gửi `waitingCageId`, hiển thị response assignment, giữ form SOAP khi lỗi, và test race khi cage không còn Available.
- Không thay đổi quy tắc SOAP S-O-A-P bắt buộc hoặc khóa record `Finalized`.

## 5. API contracts và quyền

### Combined owner booking

`POST /api/appointment-services/online-booking`, PetOwner-only.

Payload whitelist:

```json
{
  "petId": "<24-hex-id>",
  "date": "YYYY-MM-DD",
  "note": "optional",
  "services": [
    { "serviceId": "<24-hex-id>", "sequenceNo": 1, "isEmergency": false }
  ]
}
```

Không gửi `ownerId`, `code`, `isOnline`, `derivedStatus`, `checkedInAt`, hoặc các field assignment/status nội bộ. FE dùng owner API hiện hữu để refresh state sau success; không chuyển sang staff-wide booking list.

### SOAP completion

`POST /api/medical-records/service/:appointmentServiceId/complete`, Veterinarian-only.

Payload vẫn gồm SOAP, notes, weight và prescriptions theo form hiện tại; bổ sung optional `waitingCageId` là ObjectId của cage Available. BE yêu cầu đủ S/O/A/P; có thể trả `400` field errors, `403` không phải bác sĩ được phân công, `404` không tìm thấy, `409` trạng thái ca/record/subtask/cage đã thay đổi. Error mapping phải giữ nội dung đã nhập và cho phép reload/retry phù hợp.

BE validator chỉ xác thực `waitingCageId` là ObjectId; cage assignment service xác thực cage tồn tại và Available nguyên tử, trả `404` nếu không tồn tại, `409` nếu không còn Available. API docs minh họa `waitingCageId: null`; field bỏ trống cũng được chấp nhận. Tuy nhiên GET `/api/cages` chỉ authorize Admin/Receptionist, nên Veterinarian hiện không có nguồn danh sách hợp lệ. Đây là blocker phía BE cho picker, không phải lỗi có thể sửa FE độc lập.

## 6. Ràng buộc và ngoài phạm vi

- Không sửa backend hoặc API contract.
- Không thay đổi schema/type generation ngoài những bổ sung FE cần thiết.
- Không viết lại Dashboard tabs, owner list/detail, assigned staff display, walk-in, check-in, clinic appointment filters, cage CRUD/assignment, staff queue, SOAP fields, medical history hay catalog service.
- Không implement AI feature chỉ vì tab AI tồn tại; feedback yêu cầu tab riêng và tab đã có.
- Không đưa API parity chưa xác minh hoặc wishlist vào implementation scope.
- Không thêm dependency.
- Tuân thủ domain-driven services, Ant Design, styled-components và cấu trúc `components/` theo `ai_coding_rule.md`.

## 7. Acceptance criteria & kết quả nghiệm thu

- [x] PetOwner nhìn thấy booking fields đồng thời trên một form và không còn thao tác wizard Next/Back.
- [x] Submit thiếu pet/date/service bị chặn tại field tương ứng; giá trị người dùng nhập vẫn còn.
- [x] Một xác nhận hợp lệ chỉ tạo một request combined booking; success và error state vẫn đúng.
- [x] Dashboard query/prefill `tab=appointments&book=...` vẫn hoạt động.
- [x] Landing CTA mở đúng Dashboard booking; landing không còn render booking wizard.
- [x] Nút "Thêm dịch vụ" trên bảng lịch hẹn Dashboard không bị tràn chữ (cột Hành động rộng 240px, scroll ngang 960px).
- [x] BE PR #35 mở quyền cho Veterinarian & Groomer; FE tích hợp hoàn chỉnh dropdown chọn chuồng chờ đón (`waitingCageId`).
- [x] Kiểm soát tải trọng chuồng (BR-11) trực tiếp trên giao diện: vô hiệu hóa chuồng quá tải cho thú cưng kèm cảnh báo lỗi.
- [x] Nút "Chuồng" mở cho cả Bác sĩ và Groomer trong Hàng đợi khám (`StaffQueue`) để xem chi tiết và giải phóng chuồng.
- [x] Bổ sung quyền truy cập route `/cages` và menu "Quản lý chuồng" cho Bác sĩ và Groomer.
- [x] SOAP error 400/403/404/409 không làm mất draft đang nhập; finalized record vẫn read-only.
- [x] Toàn bộ kiểm thử tự động đạt 100%:
  - Unit tests: 141/141 passed (`npm test`).
  - TypeScript check: 0 errors (`npm run check-types`).
  - ESLint: 0 errors (`npm run lint`).
  - Vite build: hoàn tất trong 9.36s (`npm run build`).
  - Playwright E2E: `verify_feedback_parity_e2e.py` (5/5 pass) & `verify_vet_cage_e2e.py` (3/3 pass).
- [x] Quy trình Git Flow:
  - PR #25: `feat(booking): dat lich online mot form, go khoi landing, sua nut action` (Merged into `main` tại `e570116`).
  - PR #26: `feat(clinic): tich hop chon chuong cho don va phan quyen chuong cho bac si` (Merged into `main` tại `4f8f806`).

## 8. Kết luận nghiệm thu

Mọi yêu cầu theo feedback từ ngày 07/11/2026 đến 10/11/2026 cùng các cập nhật mới nhất từ BE PR #35 (11/11/2026) đều đã được triển khai, kiểm thử trên trình duyệt thật và hợp nhất hoàn chỉnh vào nhánh `main` của FE và BE. Working tree của cả 2 repo hiện sạch sẽ và sẵn sàng cho môi trường production.
