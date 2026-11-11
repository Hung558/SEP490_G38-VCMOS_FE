# Antigravity Handoff — FE Appointment Contract Parity

## Mission

Implement only the FE changes required to match BE revision `b91275b` in `SEP490_G38-VCMOS_FE`.

## Must implement

1. Whole appointment cancellation:
   - `PATCH /api/appointment-orders/:id/cancel`
   - body `{ reason: string }`
2. Individual appointment-service cancellation:
   - `PATCH /api/appointment-services/:id/cancel`
   - body `{ reason: string }`
3. Online booking `slotStart` input and payload.
4. Display `slotStart`, `slotEnd`, service scheduled windows, and cancellation metadata.
5. Complete waiting-cage selection in SOAP if the current `SoapForm` still does not send `waitingCageId`.

## Business rules to honor

- Cancellation reason is required and max 200 characters.
- PetOwner whole-order cancellation: own `Booked` order only; blocked within two hours of `slotStart`.
- PetOwner service cancellation: own `Booked` order and `Booked` service only; blocked within two hours of service start.
- Receptionist whole-order cancellation: `Booked` or eligible `CheckedIn`; blocked once a service is `InProgress`/`Done`.
- Receptionist service cancellation: `Booked` or `Waiting` only.
- BE remains authoritative; refresh on `409` and show the server message.
- `slotStart` is `HH:mm`, clinic hours are `08:00` to before `18:00`.
- BE computes `scheduledStart`, `scheduledEnd`, and `slotEnd`; do not ask the user for `slotEnd`.
- Veterinarian and Groomer can now read cages. Do not retain the old authorization-blocker assumption.

## Likely files

- `src/services/AppointmentOrderService/urls.ts`
- `src/services/AppointmentOrderService/index.ts`
- `src/services/AppointmentServiceService/urls.ts`
- `src/services/AppointmentServiceService/index.ts`
- `src/types/api/appointment.api.ts`
- `src/types/api/appointment-service.api.ts`
- `src/pages/Home/components/QuickBookingSection.tsx`
- `src/pages/Dashboard/index.tsx`
- `src/pages/Dashboard/components/AppointmentDetailModal.tsx`
- `src/pages/AppointmentReception/`
- `src/pages/ExamRecord/components/SoapForm.tsx`

Re-read each current file before editing and follow existing Axios, toast, modal, and refresh conventions.

## Explicit constraints

- FE only.
- Do not modify the BE repository.
- Do not create new BE routes.
- Do not revert the one-form booking flow.
- Do not overwrite or reset `tests/verify_vet_cage_e2e.py`; it has a user modification.
- Do not commit or push unless separately requested.

## Done when

- Both cancel mutations work with required reason handling.
- Booking can send `slotStart` and render BE-calculated time windows.
- Detail/list state refreshes after cancellation.
- Waiting-cage selection sends `waitingCageId` if the SOAP flow requires it.
- Typecheck, lint, focused tests, and build pass, with failures reported honestly.
