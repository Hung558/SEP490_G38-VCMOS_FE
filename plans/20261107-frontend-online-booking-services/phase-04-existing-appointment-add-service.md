# Phase 04 — Existing appointment add-service compatibility

## Goal

Keep the already delivered post-booking add-service flow distinct from initial combined booking.

## Files

- `src/pages/Dashboard/components/AddAppointmentServiceModal.tsx`
- `src/pages/Dashboard/index.tsx`
- `src/services/AppointmentServiceService/`

## Work

1. Keep `AddAppointmentServiceModal` on `POST /appointment-services/online` with payload `{ orderId, serviceId, sequenceNo?, isEmergency? }`.

2. Do not reuse the combined endpoint for this modal: it requires `petId`, `date` and a non-empty services array and would incorrectly create a new appointment.

3. Continue loading only active services, preserving current loading/empty/retry/error states and conflict form preservation.

4. Keep action visible only when the appointment is online, belongs to the current PetOwner and is eligible according to existing helper/server rules.

5. Verify Dashboard role resolution uses normalized `role`/`systemRole` and persisted `STORAGE.USER_INFO` fallback. This addresses the known defect where a PetOwner action disappeared during auth hydration or when only `systemRole` was present.

6. On success refresh the appointment list and/or selected detail without losing list filters or replacing the modal with stale cached data.

## Acceptance checks

- Existing appointment add-service still works independently.
- Initial booking never accidentally calls the single-service endpoint.
- Admin, Receptionist, Veterinarian, Groomer and Guest cannot see PetOwner mutation actions.
- PetOwner action remains visible across auth-context hydration fallback scenarios.
