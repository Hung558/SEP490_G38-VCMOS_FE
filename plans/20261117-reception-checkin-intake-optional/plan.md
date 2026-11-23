# FE Implementation Plan — Optional Reception Check-in Intake

**Repository:** `SEP490_G38-VCMOS_FE`
**BE baseline:** `55422c4`
**FE baseline:** `9125951`
**Status:** Implemented and verified on 2026-11-23.

## Completion — tester feedback follow-up

- Check-in always displays both intake fields, including when the existing flag is unset or false. This supersedes the original rollout-gate assumption below: the tester explicitly reported the missing fields. Walk-in/specialty gating is unchanged.
- Blank/whitespace-only fields remain optional and omit `intake`; partial input requires the missing field because the current BE validator requires both values when `intake` is sent.
- The existing normalizer/request builder already handled optional intake correctly; no BE, endpoint, cage, isolation or assignment changes were needed.
- Added Vietnamese helper text/placeholders, trimmed 500-character form validation, a scrollable modal body and first-error scrolling.
- Verified: `npm test` (331 passed, 1 existing skip), `npm run check-types`, `npm run lint`, `npm run build`. Build retains the existing bundle-size warning.
- Browser evidence: `tests/verify_optional_checkin_intake_e2e.py` — 7 cases with mocked API, run with flag false and unset. Covers blank/whitespace omission, partial/cleared input, trim, API-error retry, cage/staff payload, missing saved intake warning, mobile counter and cancel/reopen reset.
- Live BE persistence was not tested; API requests were isolated fixtures.
- Preserved the pre-existing edits in `tests/verify_inpatient_care_e2e.py`. No commit/push/PR.

## Original implementation plan (historical)

The completed implementation supersedes the flag-gating points in Phases 1/6 and the final non-goal below; the remaining contract and scope are unchanged.

## Phase 1 — Lock the contract and current behavior

1. Use `PATCH /api/appointment-orders/:id/check-in` as the only mutation endpoint.
2. Keep `ReceptionIntake` and `CheckInAppointmentPayload` typed; do not introduce `any`.
3. Treat `intake` as an optional request block:
   - no user input → omit the property;
   - both values entered → send both normalized strings;
   - one value entered → stop locally and require the other because the current BE validator rejects partial objects.
4. Keep the existing 500-character BE limit and trim semantics.
5. Keep `VITE_ENABLE_RECEPTION_INTAKE` as the rollout gate unless the product owner explicitly requests removal in a separate task.

## Phase 2 — Update the check-in modal

Target: `src/pages/AppointmentReception/components/CheckInConfirmModal.tsx`

1. Keep the two text areas in the existing intake section.
2. Remove unconditional `required: true` behavior from the untouched state.
3. Add cross-field validation so either started field requires the other, with clear Vietnamese messages.
4. Keep `maxLength={RECEPTION_INTAKE_FIELD_LIMIT}` and `showCount`.
5. Ensure `submit()` does not return early merely because both fields are blank.
6. Normalize the values once and pass `undefined` when the intake block is blank.
7. Preserve cage selection, isolation toggle, staff loading, assignment construction, loading state and modal reset behavior.

## Phase 3 — Align intake normalization and request construction

Targets:

- `src/services/AppointmentOrderService/intake.ts`
- `src/services/AppointmentOrderService/helpers.ts`
- `src/types/api/appointment.api.ts` only if the current type needs a narrowly scoped adjustment.

1. Keep `readReceptionIntake()` as the response-reader for complete saved records.
2. Separate “blank optional block” handling from “invalid partial block” handling so blank form state does not throw.
3. Ensure `buildCheckInPayload()` omits `intake` for undefined/blank input and returns both normalized fields for a complete input.
4. Keep the helper from sending `note`, empty arrays, or unrelated fields.
5. Preserve the existing cage whitelist and per-service assignment normalization.
6. Keep response verification in `useAppointmentReception.ts`; do not claim intake persistence unless the response contains a valid saved intake.

## Phase 4 — Map API errors and preserve UX

Targets:

- `src/pages/AppointmentReception/components/useAppointmentReception.ts`
- existing shared API error helpers only if a field-path mapping is missing.

1. Map `intake.symptoms` to the symptoms field.
2. Map `intake.initialCondition` to the initial-condition field.
3. Keep the modal open for validation, cage and assignment errors.
4. Keep the existing refresh/retry behavior for status conflicts and successful check-in.
5. Do not mutate local appointment state before a successful response.
6. Ensure a failed submit does not clear the receptionist’s entered intake values.

## Phase 5 — Tests

Update or add unit tests in the existing intake/check-in test coverage, especially:

- `tests/reception-intake.test.mjs`
- `tests/nghiep-vu-1511.test.mjs` where request-builder behavior is already covered.

Required cases:

1. Legacy/no-intake request remains `undefined` or has no `intake` key.
2. Blank/whitespace-only optional fields permit a cage-only or legacy check-in request.
3. A partial intake is rejected client-side and never sent.
4. A complete intake is trimmed and sent with both fields.
5. Boundary lengths 500/501 behave as specified.
6. Intake combined with cage, isolation and service assignments produces the expected single payload.
7. Existing cage error detection and assignment normalization remain unchanged.
8. API field-path conversion points to the correct Ant Design form fields if the current error utility supports it.

## Phase 6 — Verification

Run from `SEP490_G38-VCMOS_FE`:

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

For browser-visible verification, start Vite with the intake flag enabled and verify:

- the two optional text areas render;
- check-in succeeds with both blank;
- partial input stays open with a field error;
- complete input sends the nested object;
- cage/isolation/service assignment controls still work;
- the flag-off flow remains unchanged.

If the repository contains a dedicated reception/intake E2E script, run it with the fixture’s intake mode aligned to the feature flag. Do not alter existing verification scripts.

## Target files

- `src/pages/AppointmentReception/components/CheckInConfirmModal.tsx`
- `src/services/AppointmentOrderService/intake.ts`
- `src/services/AppointmentOrderService/helpers.ts`
- `src/pages/AppointmentReception/components/useAppointmentReception.ts` (only if error mapping requires it)
- `src/types/api/appointment.api.ts` (only if required by the typed contract)
- `tests/reception-intake.test.mjs`
- `tests/nghiep-vu-1511.test.mjs` (only where relevant)

## Non-goals

- Do not modify `SEP490_G38-VCMOS_BE`.
- Do not change the endpoint or authorization.
- Do not change cage assignment, isolation capacity rules, service queue transitions or staff availability logic.
- Do not implement walk-in, SOAP, pet-history or specialty-routing changes.
- Do not remove the feature flag without an explicit rollout decision.
- Do not commit, push, merge or create a PR as part of this plan.
