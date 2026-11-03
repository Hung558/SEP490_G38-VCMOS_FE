# AntigravityIDE handoff — FE online booking

Bạn đang làm việc trong repo `SEP490_G38-VCMOS_FE`. Đọc trước:

- `plans/20261103-frontend-online-booking/spec.md`
- `plans/20261103-frontend-online-booking/plan.md`
- `ai_coding_rule.md`
- `src/pages/Home/components/QuickBookingSection.tsx`
- `src/pages/Dashboard/index.tsx`
- `src/services/01_axios/index.ts`
- `src/services/PetService/index.ts`

## Assignment

Implement the plan end-to-end against the existing BE contract. Do not invent backend fields or endpoints.

BE endpoints:

- `POST /api/appointment-orders/online` body `{ petId, date: 'YYYY-MM-DD', note? }`, PetOwner only; success `201 { message, data }`.
- `GET /api/appointment-orders/me?status&from&to&page&limit`, PetOwner only; success `{ data, pagination }`.
- `GET /api/appointment-orders/me/:id`, PetOwner only; success `{ data }`.
- `GET /api/users/staff` exists but is NOT part of booking payload. The appointment model has no service/staff/slot field. Do not claim the selected staff or time was booked.

## Required implementation

1. Add typed `AppointmentOrderService` using `urls.ts` + `index.ts`; use existing axios instance. Respect the interceptor returning `response.data`.
2. Replace fake `setTimeout` success in `QuickBookingSection` with real create call. Load active pets through `PetService`; use DatePicker and note max 500. Disable invalid dates and past dates in Vietnam date semantics. Keep guest login gate and add no-pet CTA. Home is public, so explicitly check `useAuth().user.role` with `normalizeRole` from `src/constants/roles.ts`; only normalized `PetOwner` may load owner pets or submit. Do not rely on `getRoleGroup`, because unknown roles currently fall back to owner.
3. Remove unsupported service/staff/time-slot UI and marketing promises, not just fields from the payload. Replace them with date-only booking language. The only submitted fields are `petId`, `date`, `note`.
4. Replace Dashboard empty/mock appointments with list API, filters, server pagination, pet-name mapping, status labels, detail fetch, loading/empty/error/retry states. Update/remove `activeAppointments`, `completedAppointments`, stats and live stepper: use `derivedStatus`, never expect `status`, `service`, `doctor` or `stepIndex`; do not calculate dashboard-wide totals from one filtered page or call `Done` appointments SOAP records. Do not add cancel because no BE endpoint exists.
5. Preserve current pet management/auth/layout behavior. Follow AntD direct imports and existing styled-components conventions. No new dependency.
6. Handle 400 `errors[]`, 401/403, 404, 409 duplicate, 500/network without losing input or double-toasting. Guard stale responses and double submit.

## Verification required

- Run `npm test`, `npm run lint`, and `npm run build` (includes `tsc -b` for application projects). `typecheck`/`check-types` alone are not sufficient type-check evidence.
- Start FE and BE local as appropriate, then browser smoke with a permitted PetOwner account.
- Inspect network to prove exact payload and paths.
- Test guest, no-pet, successful 201 with returned `APT-...`, duplicate 409, list filters/pagination, detail, responsive mobile/tablet/desktop.
- Report tests actually run and any blocked checks. Do not commit or push unless explicitly asked.

## Important product boundary

The previous FE wizard advertises multiple services, doctors and time slots, but the current BE only persists a pet/date/note appointment. Implement the backend truth now; do not simulate unsupported capabilities. If a richer booking UX is required, stop and request a new BE contract instead of guessing.
