---
title: Frontend appointment reception, check-in and cage assignment
status: planned
created: 2026-11-06
---

# Spec — FE tiếp nhận lịch hẹn, check-in và phân chuồng

## 1. Mục tiêu

Nối FE với các API BE mới để nhân viên vận hành phòng khám có thể:

- Admin và Receptionist xem toàn bộ lịch hẹn online/walk-in, lọc và phân trang.
- Receptionist thực hiện check-in cho lịch đang ở trạng thái `Booked`.
- Receptionist xem lịch sử phân chuồng, lọc assignment đang mở/đã release.
- Receptionist phân một chuồng đang `Available` cho một lịch hẹn.
- Hiển thị kết quả cập nhật từ BE và xử lý an toàn các tình huống request trùng/race.

Đây là module vận hành theo đúng contract BE hiện tại. Không tự thêm release chuồng, đổi chuồng, sửa/xóa assignment, cập nhật trạng thái khám, hoặc nghiệp vụ lưu trú nếu BE chưa có endpoint.

## 2. Evidence và baseline

### BE contract

- BE current HEAD: `9e3442c`.
- Check-in commit: `c1e313b`.
- List-all-bookings commit: `373dd8b`.
- Cage-assignment commit: `d612e2a`.
- Docs:
  - `SEP490_G38-VCMOS_BE/api/appointment-orders/list-all-bookings.md`
  - `SEP490_G38-VCMOS_BE/api/appointment-orders/check-in-booking.md`
  - `SEP490_G38-VCMOS_BE/api/cage-assignments/create-cage-assignment.md`
  - `SEP490_G38-VCMOS_BE/api/cage-assignments/get-all-cage-assignments.md`
  - `SEP490_G38-VCMOS_BE/api/cage-assignments/get-cage-assignment-by-id.md`

### FE baseline

- Existing axios instance: `src/services/01_axios/index.ts`; it attaches Bearer token and returns `response.data`.
- Existing owner appointment UI in `src/pages/Dashboard/` must remain owner-scoped and must not be changed to call the staff endpoint.
- Existing cage module is in `src/services/CageService/` and `src/pages/Cages/`; it can be reused to load cages and labels.
- Exact role helper: `normalizeRole` in `src/constants/roles.ts`.
- Page child files belong under `src/pages/<Page>/components/`.
- Use direct Ant Design components and styled-components; no new dependency; no direct Axios call from UI.

## 3. Exact role matrix

| Capability                  | Admin | Receptionist | Veterinarian | Groomer | PetOwner | Guest |
| --------------------------- | ----: | -----------: | -----------: | ------: | -------: | ----: |
| Open staff appointment page |   Yes |          Yes |           No |      No |       No |    No |
| List all appointments       |   Yes |          Yes |           No |      No |       No |    No |
| Check-in appointment        |    No |          Yes |           No |      No |       No |    No |
| List cage assignments       |    No |          Yes |           No |      No |       No |    No |
| Get assignment detail       |    No |          Yes |           No |      No |       No |    No |
| Create cage assignment      |    No |          Yes |           No |      No |       No |    No |

Important: BE allows Admin to call `GET /appointment-orders`, but the cage-assignment router is protected by `authorize('Receptionist')` for every route. Do not infer that Admin's cage-management access grants assignment access.

Use exact normalized role checks. Do not use the generic `staff` role group because it includes Veterinarian and Groomer.

## 4. API contract

All paths below are relative to the existing `/api` axios base URL. Do not add `/api` in service URLs.

### 4.1 List all appointments

`GET /appointment-orders`

Allowed roles: `Admin`, `Receptionist`.

Optional query values:

- `status`: `Booked | CheckedIn | InProgress | WaitOwner | Done | Cancelled | Overdue`
- `isOnline`: query boolean `true` or `false`
- `ownerId`: 24-character Mongo ObjectId
- `petId`: 24-character Mongo ObjectId
- `code`: exact `APT-[A-Z0-9]{6}`, trim and uppercase before sending
- `from`, `to`: real `YYYY-MM-DD`; `from <= to`
- `page`: integer >= 1, default 1
- `limit`: integer 1..100, default 10

Success:

```ts
{
  data: StaffAppointment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

The list item contains populated references:

```ts
{
  _id: string;
  code: string;
  petId: { _id: string; name: string };
  ownerId: { _id: string; fullName: string; phone: string };
  date: string;
  note?: string;
  isOnline: boolean;
  derivedStatus: AppointmentStatus;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

The service must tolerate legacy/string `petId` and `ownerId` values in types because older records or fixtures may not be populated.

### 4.2 Check-in appointment

`PATCH /appointment-orders/:id/check-in`

Allowed role: `Receptionist` only. No request body.

Success `200`:

```ts
{
  message: string;
  data: AppointmentAfterCheckIn;
}
```

BE atomically updates only a `Booked` appointment to `CheckedIn` and sets `checkedInAt`. A second/concurrent request returns `409` with the current status in the message. Other errors: `400` invalid id, `401`, `403`, `404` appointment not found, `500`.

UI behavior:

- Show check-in action only for Receptionist and only when row status is `Booked`.
- Require a confirmation modal before sending.
- Disable the action while pending.
- On success update the returned row immediately or refresh the current page; preserve filters/page.
- On `409`, keep the list consistent by refreshing the current page and show the BE message.
- Admin can view status but must not see or invoke check-in controls.

### 4.3 Create cage assignment

`POST /cage-assignments`

Allowed role: `Receptionist` only.

Body whitelist:

```ts
{
  cageId: string;
  orderId: string;
}
```

Do not send `assignedById`; BE derives it from the token.

Success `201`:

```ts
{
  message: string;
  data: CageAssignment;
}
```

`cageId`, `orderId`, and `assignedById` are populated in the returned object. `releasedAt` is `null` for an open assignment.

Errors:

- `400`: invalid/missing IDs
- `403`: role not allowed
- `404`: cage not found
- `409`: cage is not `Available` or already has an active assignment
- `500`: system error

The service must send only `cageId` and `orderId`, never client-supplied operator identity.

### 4.4 List cage assignments

`GET /cage-assignments`

Allowed role: `Receptionist` only.

Optional query:

- `cageId`: Mongo ObjectId
- `orderId`: Mongo ObjectId
- `active`: query string `true` or `false`; omit for both

Success:

```ts
{ message: string; count: number; data: CageAssignment[] }
```

Results are newest first by `assignedAt`. Empty results are `200` with `count: 0` and `data: []`.

### 4.5 Assignment detail

`GET /cage-assignments/:id`

Allowed role: `Receptionist` only.

Success: `{ message: string; data: CageAssignment }`.

No assignment update, release, delete, transfer, or bulk endpoint exists in this BE contract.

## 5. Proposed FE information architecture

### 5.1 Dedicated staff page

Add a dedicated page, for example:

- `src/pages/AppointmentReception/index.tsx`
- child components/hooks/styles under `src/pages/AppointmentReception/components/`
- route: `/clinic/appointments` or `/reception/appointments`; choose one stable path and use it consistently.

Recommended page sections:

1. **Lịch hẹn toàn hệ thống**
   - table with code, date, pet, owner, phone, online/walk-in, status, checked-in time, actions
   - server pagination
   - filters for status, booking source, date range, exact appointment code
   - detail drawer/modal
2. **Phân chuồng** — Receptionist only
   - active/all assignment filter
   - assignment table with cage label, appointment code/date, pet/owner when populated, assigned by, assigned time, released time, status
   - assignment detail action
   - create assignment action from an appointment or assignment section

Do not reuse the owner Dashboard route for staff data. The current Dashboard is protected for owner group and calls `/appointment-orders/me`.

### 5.2 Check-in UX

- Status `Booked`: show primary `Check-in` button for Receptionist.
- Status other than `Booked`: no check-in action.
- Confirmation text must identify appointment code, pet and date.
- While loading, disable only the affected action and show spinner.
- Success toast uses returned message or a Vietnamese fallback.
- `409` message remains visible; refresh row/list to reflect concurrent state.
- Admin sees read-only appointment data.

### 5.3 Assignment UX

- Receptionist-only `Phân chuồng` action.
- Form fields:
  - appointment/order ID, prefilled and read-only when opened from a row
  - available cage select loaded from `CageService.listCages({ status: 'Available' })`
- Only show cages returned as `Available`; never locally invent availability.
- Submit exactly `{ cageId, orderId }`.
- After success:
  - show returned assignment
  - refresh assignment list and available cage options
  - refresh cage list if the existing cage page state is visible elsewhere; do not fake local status mutations
- On `409`, refresh available cages and assignment data because another receptionist may have claimed the cage.
- Do not show create controls to Admin, Veterinarian, Groomer, PetOwner or guest.

### 5.4 Assignment filtering/detail

- Filters are optional and serialized only when valid.
- `active=true` means `releasedAt === null`; `active=false` means released assignments.
- Detail view displays populated cage, appointment/order, assigned operator, `assignedAt`, `releasedAt`.
- Treat `releasedAt: null` as active; do not add a release button because no release API exists.

## 6. State, race and error requirements

- Use `AbortController` and request sequence guards for appointment list, assignment list, detail and available-cage loading.
- A stale response must not overwrite a newer filter/page/detail selection.
- Cancelled requests must not show error toasts.
- Prevent double-submit for check-in and assignment creation.
- Preserve current table data when a refresh fails; show retryable error state.
- Map `400 errors[]`, `401` via existing interceptor, `403`, `404`, `409`, `500/network` to non-destructive Vietnamese feedback.
- On check-in/assignment success, use the server response as source of truth.
- Never send unauthorized role, owner identity, assigned operator identity, cage status, timestamps or populated objects from client forms.

## 7. Non-goals

- No implementation of veterinarian/groomer clinical workflow.
- No appointment detail mutation other than Receptionist check-in.
- No cage update/delete/release/transfer/history UI in this feature.
- No fake inpatient dashboard or local-only occupancy state.
- No BE/auth/axios interceptor changes.
- No changes to owner booking behavior or owner Dashboard API calls.

## 8. Acceptance criteria

1. Admin and Receptionist can open the staff appointment page and list all bookings using `/appointment-orders`.
2. Filters serialize to the documented query names and values; pagination is server-side.
3. Receptionist sees check-in only for `Booked`; Admin never sees the check-in action.
4. Check-in calls `PATCH /appointment-orders/:id/check-in` with no body and handles the atomic `409` correctly.
5. Receptionist can list assignments, inspect detail and create an assignment with only `{ cageId, orderId }`.
6. Available cage options come from the real cage API; no fake occupancy mutation is used.
7. Admin, Veterinarian, Groomer, PetOwner and guest cannot access Receptionist-only assignment UI/API.
8. Loading, empty, retry, unauthorized, validation, not-found, conflict and responsive states are defined.
9. Stale requests cannot overwrite current state and duplicate submits are blocked.
10. Existing owner Dashboard and cage-management behavior remain intact.
