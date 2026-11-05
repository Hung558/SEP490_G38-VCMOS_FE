# Phase 04 — Receptionist check-in workflow

## Goal

Allow only Receptionist to atomically check in a `Booked` appointment.

## Requirements

- Show action only when normalized role is `Receptionist` and `derivedStatus === 'Booked'`.
- Ask for confirmation showing appointment code, pet and date.
- Call `PATCH /appointment-orders/:id/check-in` with no body.
- Disable the affected action while pending and block duplicate submits.
- Use returned appointment as source of truth or refresh the current server page.
- Preserve current filters/page after success.
- On 409, show BE message and refresh the current page because another request may have won the race.
- On 404, tell the user the appointment no longer exists and refresh the list.
- Do not render a check-in button for Admin or for non-Booked statuses.

## Acceptance

- Successful check-in changes the row to `CheckedIn` and displays `checkedInAt`.
- Concurrent/repeated check-in does not create a false success.
- No request body or client-supplied operator identity is sent.
