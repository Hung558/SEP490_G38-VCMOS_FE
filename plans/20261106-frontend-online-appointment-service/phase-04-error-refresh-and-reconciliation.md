# Phase 04 — Error, conflict, cancellation and refresh/reconciliation behavior

## Goal

Keep the owner UI aligned with BE truth under stale data, conflicts and request races.

## Tasks

1. Show server message for 400/401/403/404/409 using existing error extraction.
2. On 404 or inactive/non-online/blocked order, refresh the source appointment/service data.
3. On duplicate sequence `409`, preserve user selections and let them correct/retry.
4. On success, use response message, close/reset the form and refresh the selected owner appointment/list without losing filters/page.
5. Add AbortController/request sequence guards for active-service reads and appointment refreshes.
6. Ignore cancellation and stale responses; do not emit stale error toasts.
7. Document that no appointment-service list API exists, so do not fabricate a post-create service list.

## Acceptance

- Loading states always settle after success, error or cancellation.
- A stale response cannot overwrite a newly selected appointment/service state.
- Conflict recovery is actionable and does not clear unrelated form values.
- Success reflects server response without inventing unsupported lifecycle state.
