# AntigravityIDE handoff — combined online booking with services

Repo: `SEP490_G38-VCMOS_FE`

## Read first

1. `plans/20261107-frontend-online-booking-services/spec.md`
2. `plans/20261107-frontend-online-booking-services/plan.md`
3. All phase files in this directory
4. `ai_coding_rule.md`
5. `src/services/01_axios/`
6. `src/services/AppointmentServiceService/`
7. `src/services/AppointmentOrderService/`
8. `src/services/ServiceService/`
9. `src/pages/Home/components/QuickBookingSection.tsx`
10. `src/pages/Dashboard/index.tsx`
11. `src/pages/Dashboard/components/AppointmentDetailModal.tsx`
12. `src/pages/Dashboard/components/AddAppointmentServiceModal.tsx`
13. Backend docs:
    - `SEP490_G38-VCMOS_BE/api/appointment-services/create-online-booking.md`
    - `SEP490_G38-VCMOS_BE/api/appointment-orders/get-my-online-booking-by-id.md`

## Required endpoint decisions

- Initial booking: `POST /appointment-services/online-booking`.
- Add service to an existing eligible appointment: `POST /appointment-services/online`.
- Owner history: `GET /appointment-orders/me`.
- Owner detail: `GET /appointment-orders/me/:id`.
- Active catalog: `GET /services?status=Active`.

All service URLs are relative to Axios `/api` base. Never write `/api` into a URL constant.

## Initial booking request

```ts
{
  petId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  services: Array<{
    serviceId: string;
    sequenceNo?: number;
    isEmergency?: boolean;
  }>;
}
```

Send no `ownerId`, `code`, `isOnline`, `derivedStatus`, `checkedInAt`, `orderId`, staff IDs, status, queue, enqueue/dequeue or grooming fields.

## Required implementation

1. Add typed URL, payload, response and helper support for combined booking.
2. Keep the old single-service method and its payload contract intact.
3. Update the owner booking form to load only Active services and require at least one selection.
4. Allow multiple selected services with deterministic sequence behavior.
5. Prevent duplicate submit and preserve form data on recoverable conflicts.
6. Display returned appointment code and returned service summary after success.
7. Extend owner detail types/UI to render `services[]`, including populated service/staff refs and empty arrays.
8. Fix PetOwner detection in Dashboard to support `role`, `systemRole` and persisted `STORAGE.USER_INFO` fallback.
9. Keep mutation UI hidden for non-PetOwner roles and guests.
10. Do not add staff assignment, queue, grooming, payment, cancellation, deletion, reorder or status mutation controls.

## Error and request safety

Use existing error extraction and toast patterns. Handle 400/401/403/404/409 explicitly. Ignore AbortError/Axios cancellation. Abort superseded catalog/detail requests and ignore stale responses. On success refresh owner data from server truth without losing list filters/page.

## Verification commands

```bash
npm test
```

```bash
npm run check-types
```

```bash
npm run lint
```

```bash
npm run build
```

If browser/backend credentials are available, verify PetOwner success, inactive-service exclusion, duplicate date/sequence recovery, detail service rendering and responsive 375px/768px/desktop layouts. Do not claim unavailable network checks.

## Guardrails

- FE only; do not edit `SEP490_G38-VCMOS_BE`.
- No new dependencies.
- No direct Axios calls from UI.
- No commit, push, merge or PR in this task.
- Preserve existing reception, cage and Admin service behavior.
