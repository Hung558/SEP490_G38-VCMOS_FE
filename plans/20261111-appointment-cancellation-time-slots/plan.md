# FE Implementation Plan — Appointment Cancellation, Time Slots, and Waiting Cage

**BE baseline:** `b91275b`  
**Repository:** `SEP490_G38-VCMOS_FE`  
**Implementation status:** Completed & Verified (11/11/2026)

## Phase 1 — Contract and types (COMPLETED)

1. Updated `src/services/AppointmentOrderService/urls.ts` with `apiCancelAppointment(id)` → `/appointment-orders/${id}/cancel`.
2. Updated `src/services/AppointmentOrderService/index.ts` with `cancelAppointment(id, { reason })`.
3. Updated `src/services/AppointmentServiceService/urls.ts` with `apiCancelAppointmentService(id)` → `/appointment-services/${id}/cancel`.
4. Updated `src/services/AppointmentServiceService/index.ts` with `cancelAppointmentService(id, { reason })`.
5. Updated `src/types/api/appointment.api.ts` and `appointment-service.api.ts` with `slotStart`, `slotEnd`, `scheduledStart`, `scheduledEnd`, `cancelReason`, `cancelledAt`, `cancelledBy`, `CancelAppointmentPayload`, `CancelAppointmentResponse`, `CancelAppointmentServicePayload`, `CancelAppointmentServiceResponse`.
6. Updated `src/services/AppointmentServiceService/helpers.ts` with `slotStart` whitelisting, `getVietnamCurrentTime`, `validateSlotStart`, `validateCancelReason`, and `validateOnlineBookingForm`.

## Phase 2 — Booking time slot (COMPLETED)

1. Updated `QuickBookingSection.tsx` with `selectedSlotStart` and `clinicSlotOptions` (08:00–17:30, disabled if past for today).
2. Maintained the unified single-form booking UX.
3. Added client validation for `slotStart`, clinic hours, and today's past time checks.
4. Sent `slotStart` with the booking request; no `slotEnd` sent from client.
5. Rendered returned `slotStart`/`slotEnd` and service scheduled windows in `SuccessCard`.
6. Reset `selectedSlotStart` on form reset.

## Phase 3 — Shared cancellation UI (COMPLETED)

1. Created `src/components/appointment/CancelReasonModal.tsx` reusable for whole appointment and service cancellation.
2. Required trimmed reason of 1–200 characters with live character count and error feedback.
3. Disabled submit during requests and guarded against duplicate submissions.
4. Styled with warning alert and target description summary.

## Phase 4 — PetOwner appointment cancellation (COMPLETED)

1. Updated `src/pages/Dashboard/index.tsx` appointment table with `slotStart` in date column, tooltip for `cancelReason` on cancelled status, and "Hủy lịch" button for `Booked` appointments.
2. Wired `CancelReasonModal` to `AppointmentOrderService.cancelAppointment` with automatic table refresh and conflict (409) reconciliation.
3. Updated `src/pages/Dashboard/components/AppointmentDetailModal.tsx` to display `slotStart`, `slotEnd`, cancellation reason/time, and service-level `scheduledStart`/`scheduledEnd`.
4. Added "Hủy lịch hẹn" in modal footer and "Hủy dịch vụ này" on individual `Booked` service items under `Booked` orders.
5. Wired service cancellation to `AppointmentServiceService.cancelAppointmentService` with detail modal reload and parent list refresh.

## Phase 5 — Receptionist cancellation (COMPLETED)

1. Updated `src/pages/AppointmentReception/components/AppointmentTable.tsx` to show `slotStart` and "Hủy hẹn" button for `Booked` and `CheckedIn` appointments.
2. Updated `src/pages/AppointmentReception/components/AppointmentDetailModal.tsx` to display `slotStart`, `slotEnd`, and cancellation metadata.
3. Updated `src/pages/AppointmentReception/components/AppointmentServicesPanel.tsx` with "Hủy dịch vụ" action for `Booked`/`Waiting` services and cancellation reason/time display.
4. Wired receptionist cancellation in `useAppointmentReception.ts` and `AppointmentReceptionPage` with `CancelReasonModal` and table refresh.

## Phase 6 — Waiting cage completion (VERIFIED)

1. Verified `src/pages/ExamRecord/components/SoapForm.tsx` already has waiting-cage loading, capacity validation (`BR-11`), and `waitingCageId` submission fully implemented.
2. Confirmed Veterinarian/Groomer cage reading access is supported by BE without blockers.

## Phase 7 — Verification & Test Results (11/11/2026)

- **Typecheck:** `npm run check-types` passed with 0 errors.
- **Lint:** `npm run lint` passed with 0 warnings/errors.
- **Unit tests:** `npm test` ran 145/145 tests successfully (100% pass, 0 failures).
- **Added unit tests:**
  - `AppointmentOrderService urls match backend endpoints` (including `apiCancelAppointment`).
  - `buildBookingPayload` includes `slotStart`.
  - `apiCancelAppointmentService` URL builder.
  - `buildCreateOnlineBookingPayload` supports `slotStart` in whitelist.
  - `validateSlotStart` for `HH:mm`, clinic hours 08:00–18:00, and today past time.
  - `validateCancelReason` for 1–200 characters required.
  - `validateOnlineBookingForm` with `slotStart`.
- **Production Build:** `npm run build` succeeded in 12.40s (`dist/assets/index-BEda843C.js`).
- **Constraint Check:** `tests/verify_vet_cage_e2e.py` remained 100% unchanged.

## Target files

- `src/services/AppointmentOrderService/urls.ts`
- `src/services/AppointmentOrderService/index.ts`
- `src/services/AppointmentOrderService/types.ts`
- `src/services/AppointmentServiceService/urls.ts`
- `src/services/AppointmentServiceService/index.ts`
- `src/services/AppointmentServiceService/types.ts`
- `src/types/api/appointment.api.ts`
- `src/types/api/appointment-service.api.ts`
- `src/pages/Home/components/QuickBookingSection.tsx`
- `src/pages/Dashboard/index.tsx`
- `src/pages/Dashboard/components/AppointmentDetailModal.tsx`
- `src/pages/Dashboard/components/CancelAppointmentModal.tsx` (new if needed)
- relevant files under `src/pages/AppointmentReception/`
- `src/pages/ExamRecord/components/SoapForm.tsx`
- `src/services/CageService/index.ts` if the existing method needs adapting
- `src/types/api/medical-record.api.ts` only if the current payload type is incomplete

## Non-goals

- No BE changes.
- No schema or route changes.
- No changes to authorization middleware.
- No user-entered `slotEnd`.
- No replacement of the existing one-form booking flow with the old multi-step wizard.
- No overwrite of `tests/verify_vet_cage_e2e.py`.
- No commit, push, merge, or PR as part of this plan.
