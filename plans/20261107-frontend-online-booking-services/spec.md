---
title: Frontend combined online booking with appointment services
status: planned
created: 2026-11-07
---

# Spec — FE đặt lịch online kèm dịch vụ

## 1. Mục tiêu

Cập nhật luồng đặt lịch online của PetOwner theo backend mới: một request tạo đồng thời appointment và một hoặc nhiều appointment-service. Sau khi đặt lịch, owner có thể xem danh sách dịch vụ đã đặt trong chi tiết lịch hẹn; owner vẫn có thể thêm dịch vụ vào appointment đã tồn tại bằng flow cũ.

Phạm vi implementation chỉ ở `SEP490_G38-VCMOS_FE`:

- Đưa initial booking sang `POST /api/appointment-services/online-booking`.
- Load và hiển thị chỉ các service có `status: Active`.
- Cho phép chọn tối thiểu một và nhiều service trong form đặt lịch.
- Gửi đúng payload whitelist, không gửi owner hoặc field nội bộ.
- Hiển thị appointment code và các service backend trả về sau khi tạo thành công.
- Mở rộng owner appointment detail để render `services[]` đã populate và sort theo `sequenceNo`.
- Giữ flow thêm service vào appointment tồn tại qua `POST /api/appointment-services/online`.
- Sửa/chuẩn hóa PetOwner gating để hỗ trợ `role`, `systemRole` và persisted user info nhất quán.

Không sửa backend, schema, auth middleware, global Axios interceptor, Admin service management hay staff reception/cage behavior. Không thêm dependency.

## 2. Baseline và kiến trúc bắt buộc

### Backend baseline

Backend hiện tại là `main` tại commit `9b6719f`, gồm các thay đổi quan trọng:

- `2113c57 Fix online booking API`.
- `3273711 Fix get my online booking by id API`.
- Route mới `POST /api/appointment-services/online-booking`.
- Owner detail `GET /api/appointment-orders/me/:id` trả thêm `services[]`.

Tài liệu canonical cần đối chiếu:

- `SEP490_G38-VCMOS_BE/api/appointment-services/create-online-booking.md`.
- `SEP490_G38-VCMOS_BE/api/appointment-orders/get-my-online-booking-by-id.md`.
- `SEP490_G38-VCMOS_BE/api/appointment-orders/list-my-online-booking.md`.

### Frontend baseline

- React 18, TypeScript, Vite, Ant Design, styled-components, Axios, dayjs, Sonner.
- Axios instance tại `src/services/01_axios` đã có base URL `/api`, gắn Bearer token và trả `response.data`; service URL chỉ dùng path tương đối, không thêm `/api`.
- API phải nằm trong domain-driven services, không gọi Axios trực tiếp trong component.
- Page root chỉ giữ `index.tsx`; component/hook/style đặt trong `components/`.
- Dùng component Ant Design trực tiếp; styled-components chỉ cho custom styling.
- Reuse `normalizeRole`, `STORAGE.USER_INFO`, `storage`, `useAuth` và các helper/error pattern hiện có.

## 3. Role và ownership matrix

| Capability                             |                  Admin |           Receptionist |           Veterinarian |                Groomer |                       PetOwner |                  Guest |
| -------------------------------------- | ---------------------: | ---------------------: | ---------------------: | ---------------------: | -----------------------------: | ---------------------: |
| Xem initial booking UI                 |                     No |                     No |                     No |                     No |                            Yes |                     No |
| Tạo online booking                     |                     No |                     No |                     No |                     No |                   Yes, own pet |                     No |
| Xem owner booking history/detail       |                     No |                     No |                     No |                     No |       Yes, own online bookings |                     No |
| Thêm service vào appointment của owner |                     No |                     No |                     No |                     No | Yes, eligible own online order |                     No |
| Xem public active service catalog      | Theo behavior hiện tại | Theo behavior hiện tại | Theo behavior hiện tại | Theo behavior hiện tại |                            Yes | Theo behavior hiện tại |
| Gửi `ownerId` từ FE                    |                  Never |                  Never |                  Never |                  Never |                          Never |                  Never |

PetOwner detection phải không chỉ đọc `user?.role`. Dùng cùng một helper/logic để kiểm tra:

1. `user?.role` nếu có;
2. fallback `user?.systemRole`;
3. fallback persisted `STORAGE.USER_INFO`;
4. normalize role trước khi so sánh với `PetOwner`.

Server vẫn là authority cho ownership và authorization. Frontend gating chỉ là UX/security boundary bổ sung.

## 4. API contract chính xác

Tất cả URL dưới đây là relative to Axios `/api` base.

### 4.1 Initial combined online booking

`POST /appointment-services/online-booking`

Role: `PetOwner`.

Request:

```json
{
  "petId": "6ad96d4a9664da6b2c0d8d70",
  "date": "2026-11-10",
  "note": "Đón thú cưng sau 17:00",
  "services": [
    {
      "serviceId": "6ad96d4a9664da6b2c0d8d55",
      "sequenceNo": 1,
      "isEmergency": false
    }
  ]
}
```

Required top-level fields:

- `petId`: valid 24-character hexadecimal ObjectId.
- `date`: real calendar date in `YYYY-MM-DD`.
- `services`: non-empty array.

Optional top-level field:

- `note`: string.

Allowed service-item fields:

- `serviceId`: required valid ObjectId.
- `sequenceNo`: optional positive integer.
- `isEmergency`: optional boolean.

Forbidden top-level fields: `ownerId`, `code`, `isOnline`, `derivedStatus`, `checkedInAt`.

Forbidden service-item fields: `orderId`, `preferredStaffId`, `assignedStaffId`, `status`, `queueNo`, `enqueueAt`, `dequeueAt`, `groomingNote`.

The FE must build a fresh whitelist payload from form state. Do not spread API records or form objects into the request.

Backend validation also enforces:

- every selected service exists and is `Active`;
- no duplicate sequence numbers;
- pet belongs to authenticated owner;
- same pet cannot have another non-cancelled appointment on that date;
- if service creation fails, backend rolls back created services and appointment.

Success `201`:

```json
{
  "message": "Đặt lịch online thành công",
  "data": {
    "appointment": {
      "_id": "...",
      "code": "APT-K7M2QX",
      "petId": "...",
      "ownerId": "...",
      "date": "2026-11-10",
      "note": "Đón thú cưng sau 17:00",
      "isOnline": true,
      "derivedStatus": "Booked",
      "checkedInAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "services": [
      {
        "_id": "...",
        "orderId": "...",
        "serviceId": "...",
        "sequenceNo": 1,
        "preferredStaffId": null,
        "assignedStaffId": null,
        "status": "Booked",
        "isEmergency": false,
        "queueNo": null,
        "enqueueAt": null,
        "dequeueAt": null,
        "groomingNote": null,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

Do not infer receptionist email delivery, payment, queue state, assignment state or rollback state in the UI.

### 4.2 Add service to an existing appointment

`POST /appointment-services/online`

Retain the existing AddAppointmentServiceModal flow for this separate use case. Its whitelist remains:

```json
{
  "orderId": "...",
  "serviceId": "...",
  "sequenceNo": 1,
  "isEmergency": false
}
```

This endpoint must not be used to implement initial booking. It is for adding one service after an eligible appointment already exists.

### 4.3 Owner reads

- `GET /appointment-orders/me` for owner history/list.
- `GET /appointment-orders/me/:id` for owner detail.

Never replace these with staff endpoint `GET /appointment-orders`.

The detail response always contains `services`, including `[]` when none exists. The array is sorted by `sequenceNo` ascending. `serviceId` is populated with the service document; staff refs may be populated with `{ _id, fullName }`.

### 4.4 Active service catalog

`GET /services?status=Active`

Reuse `ServiceService.listServices({ status: 'Active' })`; do not duplicate Axios logic. Inactive services must not be selectable even if a stale cache contains them.

## 5. Data model requirements

Add/update typed models without weakening unrelated API contracts:

```ts
interface PopulatedServiceRef {
  _id: string;
  name: string;
  code?: string;
  category?: string;
  defaultDuration?: number;
  basePrice?: number;
  description?: string;
  status?: string;
}

interface PopulatedStaffRef {
  _id: string;
  fullName: string;
}
```

The detail service model must support backend populated/unpopulated forms:

```ts
type ServiceRef = string | PopulatedServiceRef;
type StaffRef = string | PopulatedStaffRef | null;
```

`OnlineBookingDetailResponse.data` must expose `services: OnlineAppointmentService[]`. Keep nullable fields nullable and do not make backend-populated refs mandatory for list responses that still return IDs.

The create response should have dedicated types for:

- `CreateOnlineBookingPayload`.
- `CreateOnlineBookingResponse` containing `message` and `{ appointment, services }`.
- single-service add response used by the existing modal.

## 6. UI behavior

### Initial booking form

Update `QuickBookingSection` or extract child components under its page `components/` directory. The flow must:

1. Require authenticated PetOwner context.
2. Load active services with loading, empty, error and retry states.
3. Keep existing pet selection and date validation behavior.
4. Let owner select one or more active services.
5. Show selected-service order and allow sequence editing only if product UX requires it. Recommended default: derive sequence from selection order and omit `sequenceNo` where backend can assign it.
6. Support optional `isEmergency` per selected service only if the existing product requirement needs that control; it must be boolean.
7. Keep optional note behavior.
8. Disable submit when no pet, invalid date, no service, or request is in flight.
9. Submit only the combined payload to `/appointment-services/online-booking`.
10. On success show appointment code and service summary from response, then refresh/reconcile Dashboard/history from server truth.

Do not call the old `AppointmentOrderService.createOnlineBooking` from this initial flow after migration. The old appointment-only endpoint may remain in the backend, but it must not be the normal FE booking path because it would create an appointment without the required service set.

### Appointment detail

Extend `AppointmentDetailModal` to render `appointment.services`:

- sequence number;
- service name, code/category when populated;
- duration and formatted base price when available;
- appointment-service status;
- emergency marker;
- preferred/assigned staff as read-only names when present.

Do not add buttons for assignment, queue, grooming notes, payment, status mutation, deletion or reorder.

### Existing add-service flow

Keep `AddAppointmentServiceModal` as a separate action from eligible owner appointments. It continues to call `/appointment-services/online`, loads active services, handles sequence conflict and refreshes detail/list after success.

## 7. Error, request-safety and reconciliation

Client validation:

- trim and validate ObjectIds;
- require at least one service;
- reject duplicate selected service sequence numbers before submit;
- validate sequence as positive integer when manually entered;
- validate `isEmergency` as boolean;
- validate `date` using existing real-date helper;
- do not submit inactive service IDs.

Server behavior:

- `400`: show validation message and preserve recoverable form state.
- `401`: use existing auth/session behavior.
- `403`: show owner/role restriction and do not retry blindly.
- `404`: refresh pet/service source if relevant and show server message.
- `409`: handle duplicate appointment date or duplicate sequence; preserve selections, focus the conflicting field where possible, and allow correction.
- cancellation/AbortError: ignore toast and stale state updates.

For service catalog and owner detail reads:

- abort previous request when a newer request supersedes it;
- use request sequence refs or equivalent stale-response guard;
- clear loading in all terminal paths;
- do not let stale errors overwrite a newer successful response.

After successful mutation, prefer server truth:

- use returned combined response for immediate confirmation;
- refresh owner history/detail without losing current filters/page where applicable;
- do not manufacture populated service data from the submitted form if the detail request fails.

## 8. Non-goals

- No backend modifications.
- No new package/dependency.
- No `ownerId` in any request body.
- No staff appointment endpoint in owner UI.
- No assignment, queue, grooming, payment or status mutation UI.
- No deletion/cancellation/reorder endpoint assumptions.
- No email-delivery state UI.
- No change to Admin service management.
- No commit, push, merge or PR as part of implementation handoff.

## 9. Acceptance criteria

1. PetOwner can select a pet, valid date, one or more active services and optional note.
2. Initial submit calls exactly `/appointment-services/online-booking`.
3. Request contains only `petId`, `date`, optional `note`, and `services[]` with `serviceId`, optional positive `sequenceNo`, optional boolean `isEmergency`.
4. `ownerId`, appointment defaults and appointment-service internal fields never appear in the request.
5. Inactive services are not selectable.
6. Empty service selection blocks submit with an actionable validation message.
7. Duplicate sequence numbers are blocked client-side or reported as `409` without clearing the form.
8. Success displays the returned appointment code and service summary.
9. Owner detail renders backend `services[]` sorted by sequence and handles an empty array.
10. Existing add-service action still calls `/appointment-services/online` and is not conflated with initial booking.
11. PetOwner gating supports `role`, `systemRole` and persisted user fallback; non-owner roles and guests do not see PetOwner mutation actions.
12. Loading, cancellation, stale-response, 400/401/403/404/409 and retry behavior do not leave stuck or stale UI.
13. No unsupported staff/queue/grooming/payment/status controls are introduced.
14. Existing owner history, staff reception, cage management and Admin service management remain intact.
15. Implementation passes `npm test`, `npm run check-types`, `npm run lint` and `npm run build`.
16. Browser preview evidence covers success, inactive-service filtering, conflict recovery and responsive 375px/768px/desktop states when backend credentials/data are available; unavailable checks are reported as blocked, not claimed.
