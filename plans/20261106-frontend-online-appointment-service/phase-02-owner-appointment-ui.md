# Phase 02 — PetOwner appointment eligibility and UI integration

## Goal

Expose add-service action only inside the existing authenticated owner appointment flow.

## Tasks

1. Inspect Dashboard appointment table and owner appointment detail modal.
2. Add a child modal/drawer under `src/pages/Dashboard/components/` rather than growing the page root.
3. Show `Thêm dịch vụ` only for authenticated PetOwner context and eligible online appointment statuses.
4. Keep owner reads on `/appointment-orders/me` and `/appointment-orders/me/:id`.
5. Show appointment code, date, pet and current status in the form context.
6. Preserve current appointment filters, pagination and detail behavior.
7. Ensure guests and staff roles cannot reach the mutation UI through the owner route.

## Acceptance

- Eligible owner appointment rows expose the action.
- Offline, terminal-status or unavailable appointments do not expose it.
- No staff/Admin/Veterinarian/Groomer UI receives the action.
- Existing dashboard appointment behavior is unchanged outside the new action.
