# AntigravityIDE handoff — FE appointment reception, check-in and cage assignment

Bạn đang làm việc trong repo `SEP490_G38-VCMOS_FE`. Đây là task implementation từ BE contract mới. Đọc toàn bộ tài liệu trước khi code:

- `plans/20261106-frontend-appointment-checkin-cage-assignment/spec.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/plan.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-01-contract-and-services.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-02-route-role-navigation.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-03-appointment-list-detail.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-04-checkin-workflow.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-05-cage-assignment-workflow.md`
- `plans/20261106-frontend-appointment-checkin-cage-assignment/phase-06-verification.md`
- `ai_coding_rule.md`
- `src/services/01_axios/index.ts`
- `src/constants/roles.ts`
- `src/routerMap/AppRouter.tsx`
- `src/routerMap/MenuItem.tsx`
- `src/services/AppointmentOrderService/`
- `src/services/CageService/`
- `src/pages/Cages/`

## BE contract — không được đoán khác

### Appointment

- `GET /api/appointment-orders`, allowed roles `Admin`, `Receptionist`.
- Query: `status`, `isOnline`, `ownerId`, `petId`, `code`, `from`, `to`, `page`, `limit`.
- `PATCH /api/appointment-orders/:id/check-in`, allowed role `Receptionist`, no body.
- Only `Booked` can be atomically changed to `CheckedIn`; response includes updated appointment and `checkedInAt`.

### Cage assignment

All routes are `Receptionist` only:

- `GET /api/cage-assignments`
- `GET /api/cage-assignments/:id`
- `POST /api/cage-assignments`

List query: `cageId`, `orderId`, `active`.
Create body is exactly `{ cageId, orderId }`. Do not send `assignedById`; BE takes it from token. Use existing `CageService.listCages({ status: 'Available' })` for cage choices.

There is no assignment update, release, delete, transfer or bulk endpoint. Do not build those controls.

## Required implementation

1. Add typed domain services and API types for all five new operations.
2. Add a dedicated staff appointment page/route, separate from owner Dashboard.
3. Exact role behavior:
   - Admin: appointment list/detail only.
   - Receptionist: appointment list/detail, check-in, assignment list/detail/create.
   - Veterinarian/Groomer/PetOwner/guest: blocked or redirected.
4. Add server-side appointment filters/pagination and safe populated-reference rendering.
5. Add Receptionist-only check-in confirmation and conflict handling.
6. Add Receptionist-only assignment list/detail/create flow with available cage loading.
7. Add AbortController/request-sequence protection for list/detail/availability reads and prevent double submit.
8. Preserve existing owner booking/Dashboard and current cage-management behavior.
9. Follow direct AntD imports, styled-components conventions, component-folder rule, no new dependency and no direct Axios from UI.
10. Do not modify BE. Do not commit or push unless explicitly requested.

## Verification required

Run and report:

- `npm test`
- `npm run lint`
- `npm run build`

Where local BE/credentials are available, verify:

- Admin appointment read-only behavior.
- Receptionist check-in from `Booked`, repeated/concurrent `409` behavior.
- Receptionist assignment create, list, detail and occupied-cage `409` behavior.
- Exact request paths, query strings and body whitelist.
- Veterinarian/Groomer/PetOwner/guest access blocking.
- Responsive 375px, 768px and desktop states.

Do not claim browser/network verification if prerequisites are unavailable.
