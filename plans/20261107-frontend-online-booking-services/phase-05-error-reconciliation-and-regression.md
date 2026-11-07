# Phase 05 — Errors, reconciliation and regression safety

## Goal

Make both booking mutations predictable under validation errors, conflicts, cancellation and stale data while protecting existing modules.

## Work

1. Reuse the repository API error extractor. Show a useful toast and persistent inline error where the user can recover.

2. Handle:
   - `400`: invalid date, IDs, note, service array or sequence.
   - `401`: existing session-expiration behavior.
   - `403`: PetOwner/ownership restriction.
   - `404`: missing pet, appointment or service; refresh relevant source data.
   - `409`: duplicate appointment date or duplicate sequence; preserve selected pet/date/services/note and allow correction.

3. Ignore Axios cancellation and `AbortError`; cancelled requests must not create stale toasts or clear newer state.

4. Keep a single submission lock per mutation. Ensure all success/error/finally paths release loading state.

5. Reconcile after success from returned combined response and owner detail/list endpoints. Do not infer email delivery or backend rollback state.

6. Add/extend tests for:
   - combined payload whitelist;
   - at-least-one service validation;
   - duplicate sequence handling;
   - role fallback (`role`, `systemRole`, persisted user);
   - error mapping and cancellation;
   - add-service endpoint regression;
   - detail `services[]` rendering model.

7. Run a regression review of owner booking/history, Dashboard detail, AddAppointmentServiceModal, staff reception/check-in, cage assignment and Admin service management. Do not modify unrelated behavior.

## Acceptance checks

- No stuck spinner after any terminal path.
- Conflict does not clear recoverable form state.
- New booking does not regress old add-service flow.
- Existing staff/cage/Admin features remain untouched and tests remain green.
