# Phase 05 — Cage assignment list, detail and create

## Goal

Allow Receptionist to assign an available cage to an appointment and inspect assignment history.

## Assignment list

- `GET /cage-assignments`
- Filters: `cageId`, `orderId`, `active`.
- Show newest first as returned by BE.
- Display cage label/size/isolation/status, appointment code/date/pet/owner when populated, assigned operator, assignedAt and releasedAt.
- `active=true` represents `releasedAt === null`; `active=false` represents released assignments.

## Create form

- Receptionist-only.
- Select an appointment/order; prefill `orderId` when opened from an appointment row.
- Load available cages from `CageService.listCages({ status: 'Available' })`.
- Send only `{ cageId, orderId }`.
- Never send `assignedById`, cage status, timestamps or populated objects.
- Disable submit during request.

## Success and conflict handling

- Use returned assignment object in success feedback.
- Refresh assignment list and available cages after success.
- On `409`, show BE message, refresh cage availability and keep the selected order if possible.
- On `404`, refresh source data and explain that cage/order is unavailable.

## Detail

- `GET /cage-assignments/:id`.
- Show populated cage/order/operator and release state.
- No release, update, delete or transfer action.

## Acceptance

- Only Receptionist can view or create assignments in the FE.
- Empty list is a valid successful state.
- Availability is always sourced from BE; no local fake status mutation.
