# Phase 02 — Active service catalog and combined booking form

## Goal

Migrate the normal owner booking UI from appointment-only creation to one request that creates the appointment and selected services together.

## Files

- `src/pages/Home/components/QuickBookingSection.tsx`
- New child components/hooks under the same page `components/` directory if the form becomes too large
- `src/services/ServiceService/` only for a typed helper change that is genuinely shared

## Work

1. Preserve current PetOwner/login gate, pet loading, date validation, note behavior, toast style and submit lock.

2. Load `ServiceService.listServices({ status: 'Active' })` when the booking UI opens or at the existing guarded lifecycle point. Add AbortController and stale-response protection. Render loading, retryable error and empty catalog states.

3. Add a multi-select service UI. Each selected item must retain a service ID and deterministic order. Display available service name, category, duration and formatted base price when present.

4. Require at least one service. If manual ordering is exposed, validate every sequence as a positive integer and reject duplicates before submit. Otherwise derive selection order and omit sequence values so backend assigns them.

5. If emergency selection is exposed, send only boolean `isEmergency` per service. Do not expose staff, queue or grooming fields.

6. Build a fresh combined payload and call the new AppointmentService domain method. Remove the initial-flow call to `AppointmentOrderService.createOnlineBooking`; do not delete the old method if another caller still needs it.

7. Disable submit during the request and block double clicks/Enter races.

8. On `201`, show returned appointment code and service summary. Reset/close according to existing UX, then request server-truth history/detail refresh.

## Acceptance checks

- Initial flow sends one combined request.
- A booking without a service cannot submit.
- Inactive services never appear as selectable options.
- Multi-service selection preserves order and displays useful metadata.
- Success does not claim service data that was not returned.
