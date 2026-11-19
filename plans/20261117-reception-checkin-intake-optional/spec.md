# FE Specification — Optional Reception Check-in Intake

**BE baseline:** `55422c4` (`main`)
**FE baseline:** `9125951` (`main`)
**Scope:** FE planning only; do not modify BE, commit, push, merge, or overwrite user changes.

## 1. Objective

Update the Receptionist appointment check-in modal so reception staff can record initial intake information when available:

- `intake.symptoms` — triệu chứng ban đầu.
- `intake.initialCondition` — tình trạng lúc đến / tình trạng ban đầu.

The intake section must be optional for the current rollout. A receptionist must still be able to check in an appointment without entering either field. Existing cage selection, isolation, service assignment, loading and retry behavior must remain intact.

## 2. Confirmed current FE gaps

The current FE already contains a gated intake implementation, but it does not match the latest request:

1. `CheckInConfirmModal.tsx` renders the fields only when `VITE_ENABLE_RECEPTION_INTAKE=true`.
2. Both `Form.Item`s currently use `required: true`, so the modal blocks check-in when the fields are blank.
3. `submit()` returns early when `readReceptionIntake(values.intake)` is empty, which makes intake mandatory while the flag is enabled.
4. `readReceptionIntake()` returns a value only when both fields are non-empty.
5. `buildCheckInPayload()` throws when an intake object is present but either field is missing/blank.
6. The existing FE types, endpoint method and request builder already support the nested `intake` object; this is a behavior/validation alignment task, not a new endpoint task.

No new endpoint, route, service method, cage flow or staff-assignment API is required.

## 3. Confirmed BE contract

### 3.1 Endpoint and authorization

```text
PATCH /api/appointment-orders/:id/check-in
Role: Receptionist
```

The controller passes `intake` to `appointmentOrderService.checkInAppointment`. The BE stores the received values together with `recordedBy` and `recordedAt`, then returns the updated appointment in `data`.

### 3.2 Request shape

The check-in request may combine cage, isolation, intake and service assignment data:

```json
{
  "cageId": "<optional-cage-id>",
  "requiresIsolation": false,
  "intake": {
    "symptoms": "Biểu hiện lâm sàng ban đầu",
    "initialCondition": "Tình trạng lúc đến"
  },
  "serviceAssignments": [
    {
      "appointmentServiceId": "<appointment-service-id>",
      "assignedStaffId": "<staff-id>"
    }
  ]
}
```

The FE must continue omitting `intake` entirely when no intake has been recorded. It must not send `intake: {}` or a partially populated object to the current BE.

### 3.3 Validation and contract discrepancy

The API document labels both intake fields as optional. The current BE validator, however, validates every field when the `intake` object exists and requires both trimmed strings:

- `intake.symptoms`: non-blank string, maximum 500 characters.
- `intake.initialCondition`: non-blank string, maximum 500 characters.
- Leading/trailing whitespace is trimmed.
- Validation errors are returned as `intake.symptoms` and `intake.initialCondition`.

Until BE changes the validator to accept partial intake, the FE-compatible interpretation of “optional” is:

- Both fields may remain empty; omit `intake` and allow check-in.
- If the receptionist starts an intake record by entering one field, require the other field before sending the `intake` object. Show a field-level message and keep the modal open.
- Never silently send or discard a partial intake value.
- Do not make either field required on initial untouched form state.

This preserves the user-requested optional check-in path while preventing a request that the current BE necessarily rejects. If BE later supports independent optional fields, the FE request builder can be relaxed in a separate contract update.

## 4. UI behavior

### 4.1 Intake section

In `CheckInConfirmModal.tsx`, keep the intake section in the existing check-in form and place it before the cage section:

- Section title: `Phiếu tiếp nhận ban đầu`.
- Text area label: `Triệu chứng ban đầu`.
- Text area label: `Tình trạng ban đầu`.
- Both fields are optional when untouched.
- Keep `maxLength={500}` and `showCount` in line with the BE validator.
- Trim values before constructing the request.
- Preserve values after a recoverable API validation/business error.

Use the existing `VITE_ENABLE_RECEPTION_INTAKE` flag consistently with the current rollout. The default flag-off behavior remains the legacy check-in flow with no intake UI and no intake payload. When the flag is on, the fields are visible but do not block a blank submission.

### 4.2 Submit behavior

1. Read and trim both form values.
2. If both are blank, build the check-in payload without `intake`.
3. If exactly one is non-blank, stop submission and show the missing-field error; do not call the API.
4. If both are non-blank and each is at most 500 characters, send `intake` with exactly the two normalized fields.
5. Combine intake with the existing cage/isolation and per-service assignment fields without changing their semantics.
6. A request containing only `requiresIsolation: false` should retain existing request-builder behavior and should not create an empty intake object.

### 4.3 Existing check-in behavior to preserve

- Reserved cage remains the default when no replacement cage is selected.
- Isolation changes continue to filter cage choices and clear an incompatible selection.
- Cage capacity and isolation validation remain authoritative on BE.
- Per-service staff assignments continue to be sent through `serviceAssignments`.
- No `note` field is added or overwritten by the intake UI.
- Duplicate submissions remain disabled while the request is pending.
- Successful check-in closes the modal and refreshes the appointment list.
- Cage conflicts and stale assignment errors keep the relevant form open and reload available cage data where the current flow already does so.

## 5. Error handling

- Client-side partial intake: show errors beside the missing intake field; keep both values in the form.
- BE `400` with `intake.symptoms` or `intake.initialCondition`: map to the matching field and keep the modal open.
- BE `400` for cage/assignment validation: preserve the existing cage/staff error mapping.
- BE `409` for already checked-in/status or cage conflict: show the BE message, do not mark local state successful, and refresh/reload through the existing flow.
- `403`/`404`/network/unknown errors: retain current normalized error handling and do not fabricate a saved intake record.
- If the response is successful but does not contain the submitted intake, retain the current warning-and-refresh safeguard rather than reporting that the intake was saved.

## 6. Types and request helpers

Keep the existing typed model:

```ts
interface ReceptionIntake {
  symptoms: string;
  initialCondition: string;
}

interface CheckInAppointmentPayload extends ReceptionCageSelection {
  intake?: ReceptionIntake;
  serviceAssignments?: CheckInServiceAssignment[];
}
```

Do not weaken the domain type to `any` or add nullable fields to the request merely to represent an omitted intake. Use `undefined`/omission for the no-intake case.

Update the normalization/helper tests to cover:

- no intake input → `undefined` and no `intake` key;
- both fields blank → no intake and check-in remains allowed;
- only symptoms or only initial condition → client validation prevents submission;
- both values → trim and send both fields;
- whitespace-only values → treated as blank;
- 500 characters accepted, 501 rejected;
- cage/isolation/service assignments are unchanged when intake is omitted or present.

## 7. Acceptance criteria

- With the feature flag enabled, the receptionist can confirm check-in with both new fields untouched.
- A blank submission does not send `intake`, `{}`, or partial intake.
- Entering only one field produces a clear client-side error and does not call `PATCH`.
- Entering both fields sends trimmed `intake.symptoms` and `intake.initialCondition`.
- Each field is limited to 500 characters and displays a counter.
- Existing cage, isolation and service assignment behavior is unchanged.
- API field errors map to the correct intake field without losing form input.
- The legacy flag-off flow remains backward compatible.
- No BE source or unrelated FE flow is changed.

## 8. Non-goals

- No BE validator or API documentation change.
- No new check-in endpoint.
- No change to appointment status transitions, cage assignment rules, isolation rules or service queue rules.
- No change to walk-in intake, SOAP, pet history or staff specialty routing.
- No persistence of a partial intake object in browser state or local storage.
- No commit, push, merge or PR in this planning task.
