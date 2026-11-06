# Phase 03 — Active service loading, form validation and submission states

## Goal

Let PetOwner choose a valid active catalog service and submit one guarded create request.

## Tasks

1. Load `ServiceService.listServices({ status: 'Active' })` when the form opens or through a guarded cache.
2. Render service loading, empty, error and retry states.
3. Display name, category, duration and formatted base price.
4. Validate `orderId`, `serviceId`, optional positive `sequenceNo` and boolean `isEmergency`.
5. Prefer omitting `sequenceNo` so BE assigns the next position unless product UX explicitly needs manual ordering.
6. Disable submit while pending and prevent duplicate clicks.
7. Reset form state after close or successful creation.

## Acceptance

- Inactive services never appear as selectable options.
- Empty/error catalog states are understandable and recoverable.
- Submitted body contains only documented fields.
- The form cannot issue duplicate concurrent creates from one submit action.
