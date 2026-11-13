# FE Specification — Appointment Cancellation, Time Slots, and Waiting Cage

**BE baseline:** `b91275b`  
**Scope:** FE only; do not modify BE, commit, push, or overwrite user changes.

## 1. Objective

Synchronize the FE with the current BE contract for:

1. Whole appointment cancellation.
2. Individual appointment-service cancellation.
3. Online booking with a required start time on the new form; the API remains backward compatible.
4. Appointment cancellation/scheduling metadata display.
5. Waiting-cage selection during SOAP completion, now that Veterinarian and Groomer can read cages.

## 2. Confirmed FE gaps

- `AppointmentOrderService/urls.ts` has no whole-order cancel URL.
- `AppointmentOrderService/index.ts` has no cancel method.
- `AppointmentServiceService/urls.ts` has no individual-service cancel URL.
- `AppointmentServiceService/index.ts` has no cancel method.
- Dashboard appointment actions do not expose cancellation.
- Appointment API types do not expose `slotStart`, `slotEnd`, `cancelReason`, `cancelledAt`, or `cancelledBy`.
- The one-form booking UI currently selects a date but does not expose/send `slotStart`.
- Waiting-cage BE access is no longer blocked for Veterinarian/Groomer; `SoapForm` must be rechecked and completed if it still does not render/send `waitingCageId`.

## 3. BE contracts

### 3.1 Cancel whole appointment

`PATCH /api/appointment-orders/:id/cancel`

Roles: `PetOwner`, `Receptionist`

```json
{ "reason": "Không thể đến phòng khám" }
```

PetOwner rules:

- Own appointment only.
- Appointment must be `Booked`.
- With `slotStart`, cancellation is blocked during the two hours before the scheduled start.
- Without `slotStart`, a past-date appointment cannot be cancelled.

Receptionist rules:

- Appointment must be `Booked` or `CheckedIn`.
- A `CheckedIn` appointment cannot be cancelled if any service is `InProgress` or `Done`.

Success changes the order to `Cancelled`; pending `Booked`/`Waiting` services are also cancelled and queue fields are cleared.

### 3.2 Cancel one service

`PATCH /api/appointment-services/:id/cancel`

Roles: `PetOwner`, `Receptionist`

```json
{ "reason": "Không cần sử dụng dịch vụ này" }
```

PetOwner rules:

- Service must belong to the owner's appointment.
- Parent appointment and service must both be `Booked`.
- Cancellation is blocked during the two hours before `scheduledStart` or the parent `slotStart`.

Receptionist rules:

- Service must be `Booked` or `Waiting`.
- Services already `InProgress`, `Done`, `Cancelled`, or otherwise blocked cannot be cancelled.

Success changes the service to `Cancelled`, clears `queueNo`/`enqueueAt`, and may change the parent appointment to `Cancelled` or `WaitOwner` according to BE rules.

### 3.3 Online booking time

The combined booking payload accepts:

```json
{
  "petId": "<pet-id>",
  "date": "YYYY-MM-DD",
  "slotStart": "09:00",
  "note": "Ghi chú",
  "services": [
    {
      "serviceId": "<service-id>",
      "sequenceNo": 1,
      "isEmergency": false
    }
  ]
}
```

Rules:

- `slotStart` format: `HH:mm`.
- Clinic time: `08:00` through before `18:00`.
- For today, the selected time cannot be in the past.
- BE calculates each service's `scheduledStart`/`scheduledEnd` and the appointment `slotEnd`.
- FE must not require users to enter `slotEnd`.

### 3.4 Waiting cage

Readable by `Admin`, `Receptionist`, `Veterinarian`, and `Groomer`:

- `GET /api/cages`
- `GET /api/cages/:id`

SOAP completion may send:

```json
{ "waitingCageId": "<cage-id>" }
```

The old assumption that Veterinarian cannot read cages is obsolete.

## 4. FE behavior

### 4.1 Types and services

Add the two cancel URL builders and service methods. Request payload type:

```ts
{
  reason: string;
}
```

Extend appointment/order types with optional nullable fields:

```ts
slotStart?: string | null;
slotEnd?: string | null;
cancelReason?: string | null;
cancelledAt?: string | null;
cancelledBy?: string | null;
```

Extend service item types with `scheduledStart`, `scheduledEnd`, and cancellation metadata when absent.

### 4.2 Booking form

In `QuickBookingSection`:

- Require `slotStart` on the existing single form. The API payload type remains optional for legacy callers.
- Offer 30-minute starts from `08:00` to `17:30`; disable elapsed starts today (Vietnam time) and starts that end after `18:00`.
- Estimate the end from the sum of service durations (30 minutes when a duration is missing or nonpositive), show the range and total, and revalidate against the latest time and selection on submit.
- Include `slotStart` in the booking request.
- Map BE time/duration errors to the time field or a clear form-level message.
- Display the returned start/end time after success or in appointment detail.
- Do not send a user-entered `slotEnd`.

### 4.3 PetOwner Dashboard

Whole appointment:

- Add a cancel action for eligible `Booked` appointments.
- Open a required reason modal with a 200-character limit.
- Disable submit for blank/whitespace-only reason and while submitting.
- On success, refresh or reconcile the appointment and show `Cancelled` plus cancellation reason/time when present.
- On `409`, show the BE message and refresh stale detail/list data; never mark local state cancelled before success.

Individual service:

- Add a cancel action in appointment detail for eligible services.
- Hide/disable the action for statuses that cannot be cancelled.
- Re-fetch detail after success so service status, queue fields, and parent status are accurate.

### 4.4 Receptionist UI

Add whole-order and service cancellation to the existing reception appointment/detail actions where the role is Receptionist. Use the same required-reason modal and refresh behavior. The UI may pre-filter actions by status, but BE remains authoritative for race conditions and `409` responses.

### 4.5 SOAP waiting cage

If `SoapForm` still lacks the flow:

- Load available cages through the existing cage service.
- Render an optional cage selector for the appropriate staff flow.
- Submit `waitingCageId` on completion.
- Show the resulting assignment when returned.
- On cage conflict/stale data, show the BE error and refresh cage options.

## 5. Error handling

- `400`: validation message; keep modal/form open.
- `403`: show permission/ownership error; do not mutate local data.
- `404`: show not-found message and refresh the relevant list/detail.
- `409`: show BE business-rule message and refresh stale appointment/service data.
- Network/unknown error: show retry message; do not mark mutation successful.

## 6. Acceptance criteria

- FE calls both cancellation endpoints with `{ reason }`.
- PetOwner and Receptionist actions respect the visible status rules.
- A successful whole-order cancel renders `Cancelled`.
- A successful service cancel updates the service and parent appointment after refresh.
- Booking sends `slotStart` in `HH:mm` and displays BE-calculated `slotEnd`.
- Invalid/past/out-of-hours times are prevented or clearly rejected.
- Appointment and service cancellation metadata is typed and displayed where detail UI supports it.
- Veterinarian/Groomer cage access is treated as available under the new BE contract.
- Existing user modification `tests/verify_vet_cage_e2e.py` is preserved.

## 7. Verification and Results (Completed on 11/11/2026)

- **Typecheck:** `npm run check-types` passed with 0 errors.
- **Lint:** `npm run lint` passed with 0 warnings/errors.
- **Automated Tests:** `npm test` ran 145/145 unit tests successfully (100% pass rate).
- **Production Build:** `npm run build` completed successfully in 12.40s.
- **Preservation Check:** `tests/verify_vet_cage_e2e.py` was kept pristine and untouched.
- **Status:** All acceptance criteria satisfied and ready for merge into `main`.

## 8. Follow-up — Feedback tab 11/11/2026

1. Verify booking estimate, required slot, same-day cutoff, exact closing boundary, and request whitelist. If date or services invalidate the selection, preserve all inputs, show the time error, and require a new valid start.
2. Gate owner whole-order and service cancellation at the two-hour boundary using Vietnam time. Use `scheduledStart` before order `slotStart` for a service; for older appointments without either, compare dates.
3. Gate reception actions on actual service statuses and refresh the open service panel after whole-order cancellation.
4. Run unit tests plus `tests/verify_appointment_feedback_e2e.py` and `tests/verify_soap_feedback_e2e.py` against Vite with mocked API, then lint and build. A live BE/DB run is separate.

### Other tabs checked against the repo

- Auth illustrations and layout, email reminder, pet controls and admin UI were shipped in PRs #8, #10 and #12. Admin services and role profiles were shipped in #11 and #15. This follow-up does not change or re-approve those visuals.
- The owner dashboard tabs, single booking form, staff assignment display, and reception walk-in exist in the prior FE changes (including #23, #24 and #25). The AI tab exists separately; live AI functionality was not part of the feedback contract.
- The SOAP fixes use the BE record status. The feedback says to finalize at completion, but the current BE finalizes at payment; FE does not pretend the record was finalized. See the SOAP spec for details.
