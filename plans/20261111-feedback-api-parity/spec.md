---
title: Close verified FE feedback and API parity gaps
status: planned
created: 2026-11-11
repositories:
  frontend: SEP490_G38-VCMOS_FE
  backend: SEP490_G38-VCMOS_BE
---

# Spec: Các gap FE đã xác minh từ feedback 7-10/11

## 1. Mục tiêu

Chỉ xử lý hai gap đã xác minh trong feedback tab 7/11/2026 và API BE ở baseline audit:

1. Đặt lịch online của PetOwner phải là một form hiển thị đồng thời thú cưng, dịch vụ, ngày và ghi chú; người dùng kiểm tra lỗi tại chỗ và xác nhận một lần. Booking đã được đưa vào tab Dashboard nhưng hiện vẫn là wizard bốn bước, đồng thời landing page vẫn render nguyên booking wizard.
2. Ghi nhận gap backend-blocked cho lựa chọn chuồng chờ đón khi hoàn tất SOAP: complete API nhận `waitingCageId`, nhưng vai trò Veterinarian không được gọi `GET /api/cages` để lấy lựa chọn. Không implement picker giả định; cần BE mở API tra cứu cages cho Veterinarian hoặc cung cấp endpoint phù hợp rồi mới hoàn thiện UI.

Phạm vi chỉ là frontend. Không sửa BE, không thêm AI functionality, không làm lại walk-in, check-in, phân công, hàng đợi hay SOAP đã có. Không commit, push, merge hoặc tạo PR trong công việc dựa trên tài liệu này.

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

| Feedback/API capability                                 | BE contract/evidence                                                                                                                                | FE hiện tại                                                                                                   | Kết luận                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dashboard có tab pets, appointments, AI                 | Feedback 7/11                                                                                                                                       | Ba tab có trong `Dashboard/index.tsx`; AI được gắn nhãn đang phát triển                                       | Đã đáp ứng cấu trúc tab; AI thật không được yêu cầu nếu chưa có API/đặc tả                  |
| Owner xem nhân sự được phân công                        | Owner appointment detail trả dịch vụ/nhân sự; appointment service API                                                                               | Dashboard tải chi tiết mỗi appointment để dựng tên nhân sự; detail modal cũng hiện nhân sự                    | Đã triển khai                                                                               |
| Booking nằm trong Dashboard, không còn wizard ở landing | Combined booking `POST /api/appointment-services/online-booking`                                                                                    | Đã embed trong tab appointments, nhưng landing vẫn render cùng component và CTA cuộn tới đó                   | Một phần; cần đưa CTA vào Dashboard và loại form booking khỏi landing                       |
| Booking một form và xác nhận một lần                    | Combined booking nhận petId/date/note/services trong một request; validator BE                                                                      | `QuickBookingSection` vẫn có Steps 4 bước và chỉ render field của step hiện tại                               | Chưa đáp ứng; cần đổi UI và validation, giữ nguyên API                                      |
| Walk-in customer lookup/intake                          | `GET /appointment-orders/walk-in/customer-lookup`; `POST /appointment-orders/walk-in` (Receptionist/Admin theo route); danh mục dịch vụ/staff/cages | `WalkInModal` gọi lookup, load catalog/staff/cage, build payload, xử lý response/lỗi                          | Đã có service và UI; không đưa vào backlog                                                  |
| Check-in/lịch clinic                                    | `GET /appointment-orders`; `PATCH /appointment-orders/:id/check-in`                                                                                 | AppointmentOrderService có list/check-in; reception UI dùng các service này                                   | Đã tích hợp theo source audit; không đưa vào backlog                                        |
| Cage assignment                                         | `POST/GET /cage-assignments`, detail/by-order/release                                                                                               | CageAssignmentService được gọi trong reception và queue; modal tạo/phân chuồng                                | Đã tích hợp theo source audit; không đưa vào backlog                                        |
| Queue/start/SOAP/history                                | `GET /appointment-services/my-queue`; medical-record start/save/complete/detail/history; medicine catalog                                           | StaffQueue, ExamRecord, SoapForm, history drawer và MedicalRecordService đang gọi các API                     | Đã có luồng nền tảng; ngoại lệ là lựa chọn chuồng chờ đón khi hoàn tất                      |
| Waiting cage at completion                              | Complete nhận `waitingCageId`; tạo assignment nếu truyền. Tuy nhiên `GET /api/cages` chỉ cho Admin/Receptionist, không cho Veterinarian             | Payload type có field nhưng SoapForm không có picker; Veterinarian không thể tải cage catalog qua API hiện có | Backend-blocked; yêu cầu BE cung cấp quyền/endpoint đọc cages phù hợp trước khi thêm picker |

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

## 7. Acceptance criteria

- [ ] PetOwner nhìn thấy booking fields đồng thời trên một form và không còn thao tác wizard Next/Back.
- [ ] Submit thiếu pet/date/service bị chặn tại field tương ứng; giá trị người dùng nhập vẫn còn.
- [ ] Một xác nhận hợp lệ chỉ tạo một request combined booking; success và error state vẫn đúng.
- [ ] Dashboard query/prefill `tab=appointments&book=...` vẫn hoạt động.
- [ ] Landing CTA mở đúng Dashboard booking; landing không còn render booking wizard.
- [ ] Assigned staff, appointment history/detail và Dashboard tabs không bị regression.
- [ ] Không tạo cage picker cho Veterinarian trước khi BE mở endpoint/role đọc danh sách Available cages.
- [ ] Sau khi prerequisite BE được cung cấp, spec cho waiting-cage picker phải được cập nhật/duyệt riêng; test complete request, response assignment, race 409 và giữ SOAP draft.
- [ ] SOAP error 400/403/404/409 không làm mất draft đang nhập; finalized record vẫn read-only.
- [ ] Các case trên có test phù hợp; ghi lại kết quả tests/typecheck/lint/build thực tế.
- [ ] Chỉ thay đổi FE; không sửa BE và không commit/push trong gói công việc này.

## 8. Open implementation verification

Trước khi code, xác nhận ở BE baseline mới nhất:

- BE mở quyền/API đọc Available cages an toàn cho Veterinarian trước khi triển khai FR-3. API hiện có chỉ cho Admin/Receptionist.
- Nếu BE cấp endpoint đó, xác nhận filter/shape response và tính phù hợp size/isolation với pet.
- Landing CTA event/login behavior và dashboard query parser để giữ tương thích.

Nếu contract thực tế khác tài liệu feedback, dùng route/validator/service hiện tại làm authority; cập nhật spec trước khi mở rộng phạm vi.
