---
title: Frontend add-service-to-online-appointment
status: planned
created: 2026-11-06
---

# Spec — FE thêm dịch vụ vào lịch hẹn online

## 1. Mục tiêu

Tích hợp BE API mới để PetOwner có thể thêm một dịch vụ đang hoạt động vào lịch hẹn online của chính họ từ luồng Dashboard / chi tiết lịch hẹn.

Phạm vi FE:

- Hiển thị danh sách dịch vụ công khai, chỉ cho chọn service `Active`.
- Cho PetOwner chọn lịch hẹn online hợp lệ của chính mình.
- Gửi yêu cầu tạo appointment-service với payload đúng contract.
- Cho phép tùy chọn `sequenceNo` và `isEmergency` nếu UI/UX cần, nhưng không gửi các field nội bộ của quy trình.
- Hiển thị trạng thái loading, success, validation, conflict và lỗi quyền/sở hữu.
- Sau khi tạo thành công, cập nhật lại dữ liệu lịch hẹn / danh sách dịch vụ đã chọn theo server truth.

Không mở rộng sang phân công nhân sự, queue, grooming note, medical record, hóa đơn, release assignment hay cập nhật trạng thái appointment-service vì BE chưa có endpoint tương ứng trong contract này.

## 2. Evidence và baseline

### BE baseline

- BE branch: `main`, clean và đồng bộ `origin/main`.
- HEAD hiện tại: `a10bcb5`.
- Feature commit: `068da43 Allow PetOwner create online appointment service`.
- Existing related commits: `9e3442c` check-in merge, `d612e2a` cage assignment, `373dd8b` list all bookings.
- Canonical API doc: `SEP490_G38-VCMOS_BE/api/appointment-services/create-online-appointment-service.md`.
- Route registration: `server.js` mounts `/api/appointment-services`.

### FE baseline

- Existing Axios instance: `src/services/01_axios`; it attaches Bearer token and returns `response.data`. Services must not unwrap `response.data` twice.
- Existing appointment owner flow: `src/services/AppointmentOrderService/`, `src/pages/Dashboard/`, and `src/pages/Home/components/QuickBookingSection.tsx`.
- Existing public/admin service catalog: `src/services/ServiceService/` and `src/pages/AdminServices/`.
- Existing owner-only route guard: `RoleRoute allow={['owner']}`.
- Existing exact role helper: `normalizeRole` in `src/constants/roles.ts`.
- Existing page architecture: page root contains `index.tsx`; child components/hooks/styles belong under `components/`.
- Follow `ai_coding_rule.md`: direct Ant Design components, styled-components only when styling is needed, domain services instead of direct Axios, no new dependency.

## 3. Exact role and ownership matrix

| Capability                 | Admin | Receptionist | Veterinarian | Groomer |                   PetOwner | Guest |
| -------------------------- | ----: | -----------: | -----------: | ------: | -------------------------: | ----: |
| See add-service UI         |    No |           No |           No |      No |                        Yes |    No |
| List public services       | Yes\* |        Yes\* |        Yes\* |   Yes\* |                        Yes |   Yes |
| Create appointment service |    No |           No |           No |      No | Yes, own online order only |    No |
| Send `ownerId`             | Never |        Never |        Never |   Never |                      Never | Never |

`*` Existing `GET /api/services` is public, but this feature only needs it for the PetOwner flow. Do not add staff mutation access or infer permissions from the public catalog.

Guest behavior: preserve existing login redirect behavior. Direct calls must not be made without authenticated PetOwner context.

## 4. API contract

All paths are relative to the existing `/api` Axios base URL. Do not put `/api` into service URL constants.

### 4.1 Create service for online appointment

`POST /appointment-services/online`

Allowed role: `PetOwner` only. The order must belong to the authenticated owner; `ownerId` is derived from the token and is never sent by FE.

Request body:

```json
{
  "orderId": "6ad96d4a9664da6b2c0d8d70",
  "serviceId": "6ad96d4a9664da6b2c0d8d55",
  "sequenceNo": 1,
  "isEmergency": false
}
```

`sequenceNo` and `isEmergency` are optional. If omitted, BE assigns the next sequence and defaults emergency to `false`.

Payload whitelist: only `orderId`, `serviceId`, optional positive integer `sequenceNo`, and optional boolean `isEmergency`. Never send `ownerId`, `preferredStaffId`, `assignedStaffId`, `status`, `queueNo`, `enqueueAt`, `dequeueAt`, or `groomingNote`.

Success `201`:

```json
{
  "message": "Tạo dịch vụ cho lịch hẹn online thành công",
  "data": {
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
}
```

### 4.2 Existing services catalog dependency

`GET /services`

Public endpoint used to load selectable services. Existing FE `ServiceService.listServices` returns `{ services }` and supports `search`, `category`, and `status` query filters. The add-service flow must request `status=Active` and must not expose inactive services as selectable choices.

The service detail/list response contains `code`, `name`, `category`, `defaultDuration`, `basePrice`, `description`, and `status`.

### 4.3 Existing owner appointment dependency

`GET /appointment-orders/me` and `GET /appointment-orders/me/:id` remain owner-scoped. Do not replace them with staff endpoint `/appointment-orders`.

The new create endpoint accepts only online orders and rejects orders with `Done`, `Cancelled`, or `Overdue`. FE should preferably hide unavailable orders and still render server errors if data becomes stale.

## 5. Validation and error behavior

### Client-side validation

- `orderId`: required, trimmed, valid 24-hex ObjectId.
- `serviceId`: required, trimmed, valid 24-hex ObjectId.
- `sequenceNo`: optional positive integer; omit when empty.
- `isEmergency`: optional boolean; default UI state may be `false` but the payload must remain boolean if sent.
- Selected service must come from the active service list.
- Selected appointment must be an owner-owned online appointment. Do not trust only client state; BE remains authoritative.

### Server errors

Use the shared API error extraction pattern and display a useful toast plus persistent form/list error when appropriate:

- `401`: session expired / redirect or show existing auth behavior.
- `403`: user is not PetOwner or order belongs to another owner.
- `404`: appointment or service no longer exists; refresh the relevant source list.
- `409`: duplicate `sequenceNo`; preserve form selections, explain conflict, and either request a new sequence or retry without manually inventing server state.
- inactive service / non-online order / blocked appointment status: show server message and refresh appointments or active services.
- cancelled requests must not create stale toasts or overwrite current state.

## 6. UI and interaction requirements

Recommended integration: extend the existing PetOwner Dashboard appointment area rather than creating a staff page.

### Appointment list/detail

- Preserve current owner appointment list, filters, pagination, and detail behavior.
- Add an action such as `Thêm dịch vụ` only for eligible online appointments and only for PetOwner context.
- Eligibility should exclude at least appointments known to be `Done`, `Cancelled`, and `Overdue`; server validation remains authoritative.
- Open a modal/drawer/form containing:
  - appointment code/date/pet summary;
  - active service selector with name, category, duration and formatted base price;
  - optional emergency switch;
  - optional sequence input only if product requires manual ordering; default recommended behavior is omit it and let BE auto-assign;
  - submit/cancel actions.
- Disable submit while creating and prevent double submission.
- On success close/reset the form, show server message, and refresh the selected appointment/list if the API response or existing detail model can represent the new service.

### Service catalog

- Reuse `ServiceService.listServices({ status: 'Active' })` or add a typed helper without duplicating Axios logic.
- Handle empty active catalog with an explicit empty state and disabled submit.
- Do not let users choose inactive services from stale cached options.

### Data model limitation

The current appointment-order APIs return appointment order data but do not document a populated `appointmentServices` array in `GET /appointment-orders/me/:id`. The implementation must not pretend that the created service is visible in the order detail unless BE returns it. If the product needs a visible service list after creation, document the limitation and use the returned creation response only for confirmation until a list/detail appointment-service API exists.

## 7. Non-goals

- No staff appointment-service list/detail endpoint.
- No update/delete/cancel/reorder endpoint for appointment services.
- No assigning preferred/assigned staff.
- No queue management or emergency prioritization beyond sending the documented boolean.
- No BE changes, schema changes, auth changes, or new dependencies.
- No modification of the existing owner appointment API contract.

## 8. Acceptance criteria

1. PetOwner can open the add-service action from an eligible own online appointment.
2. FE loads only active services and displays a usable empty/loading/error state.
3. Submit sends exactly the documented allowed fields and omits `ownerId` and internal fields.
4. `sequenceNo` is omitted when not provided and validated as a positive integer when provided.
5. `isEmergency` is sent only as a boolean when enabled/represented by the form.
6. Success handles `201`, shows the server message, and refreshes or reconciles the current appointment view without losing owner filters.
7. 400/401/403/404/409 responses are visible and do not leave a stuck loading state.
8. Duplicate-click and stale-request protection prevents duplicate submissions and stale UI updates.
9. Non-PetOwner roles and guests do not see or use the PetOwner mutation UI; existing route guards remain authoritative.
10. Existing booking, appointment history/detail, staff reception, cage management, and Admin service management behavior remain unchanged.
11. Tests cover URL, query/payload whitelist, validation, error parsing, role gating and success/conflict behavior.
12. `npm test`, `npm run check-types`, `npm run lint`, and `npm run build` results are reported accurately after implementation.
