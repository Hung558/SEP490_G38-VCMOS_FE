---
title: Frontend add-service-to-online-appointment
status: completed
created: 2026-11-06
---

# Plan — FE thêm dịch vụ vào lịch hẹn online

## Baseline

- BE `main` is clean and synchronized with `origin/main` at `a10bcb5`.
- New BE contract: `POST /api/appointment-services/online` from commit `068da43`.
- Canonical doc: `SEP490_G38-VCMOS_BE/api/appointment-services/create-online-appointment-service.md`.
- Existing FE owner appointment flow: `src/pages/Dashboard/`, `src/pages/Home/components/QuickBookingSection.tsx`, `src/services/AppointmentOrderService/`.
- Existing service catalog: `src/services/ServiceService/` and `src/pages/AdminServices/`.
- Canonical requirements: `spec.md` in this directory.

## Constraints

- Keep the feature PetOwner-only and owner-scoped.
- Use exact role normalization and existing owner route guard; do not use generic staff grouping.
- Use domain services and relative API paths; do not call Axios directly from UI or add a second `/api` prefix.
- Send only documented appointment-service fields. Never send `ownerId` or internal workflow fields.
- Reuse active public service catalog; do not modify Admin service management behavior.
- No BE, schema, auth, dependency, commit or push changes in the implementation unless separately authorized.
- Preserve existing Dashboard booking/history/detail and staff appointment/cage modules.

## Phases

- [x] Phase 01 — Contract types, URLs, payload helpers and service method
- [x] Phase 02 — PetOwner appointment eligibility and add-service UI integration
- [x] Phase 03 — Active service loading, form validation and submission states
- [x] Phase 04 — Error, conflict, cancellation and refresh/reconciliation behavior
- [x] Phase 05 — Tests, typecheck, lint, build and browser verification

## Phase 01 — Contract types, URLs and services

- Add an `AppointmentService` domain service or extend the existing appointment service according to repository convention.
- Add URL constant for `/appointment-services/online` without `/api`.
- Define types for create payload, response, appointment-service status and optional fields.
- Add helpers that:
  - trim and validate ObjectIds;
  - omit undefined optional fields;
  - whitelist only `orderId`, `serviceId`, `sequenceNo`, `isEmergency`;
  - never forward forbidden fields.
- Reuse `ServiceService` for active service catalog and add optional AbortSignal support where needed.
- Add shared/feature error parsing without changing the global Axios interceptor.

## Phase 02 — Owner appointment UI integration

- Extend the existing owner Dashboard appointment list/detail flow, preferably under `src/pages/Dashboard/components/`.
- Show `Thêm dịch vụ` only for eligible online appointments in authenticated PetOwner context.
- Keep `/appointment-orders/me` and `/appointment-orders/me/:id` for owner reads.
- Do not create a staff route or expose the mutation on Admin/Receptionist/Veterinarian/Groomer screens.
- Pass the selected appointment identity into a dedicated child component/modal; keep page root readable.

## Phase 03 — Active service selector and form

- Load `ServiceService.listServices({ status: 'Active' })` when the form opens or use a guarded cached list.
- Render loading, empty, error and retry states for service choices.
- Show service name, category, duration and formatted price.
- Validate required order/service IDs, optional positive `sequenceNo`, and boolean `isEmergency`.
- Prefer automatic BE sequence assignment by omitting `sequenceNo` unless product UX explicitly needs manual ordering.
- Disable submit during request and prevent double clicks.

## Phase 04 — Error and server truth

- On success, use the `201` response message and reset/close the form.
- Refresh the selected owner appointment/detail or current list without losing filters/page.
- Treat 401/403/404/409 and inactive/non-online/blocked-order messages distinctly enough for the user to recover.
- Preserve selections for recoverable conflicts such as duplicate sequence number.
- Add AbortController/request sequence guards to active-service reads and appointment/detail refreshes; ignore cancellation and stale responses.
- Do not claim a visible appointment-service list if the BE detail response does not provide one. Report this limitation in implementation notes.

## Phase 05 — Verification

- Unit/contract tests:
  - exact URL `/appointment-services/online`;
  - payload whitelist and trimming;
  - omission of optional/forbidden fields;
  - ObjectId and sequence validation;
  - active service query;
  - API error extraction;
  - PetOwner-only eligibility.
- Run:
  - `npm test`
  - `npm run check-types`
  - `npm run lint`
  - `npm run build`
- Browser-preview verification when implementation exists:
  - PetOwner opens eligible appointment and submits successfully;
  - inactive services are not selectable;
  - duplicate submit is blocked;
  - 409/error state recovers without stale UI;
  - guest/non-owner routes remain blocked;
  - responsive 375px, 768px and desktop states.
- If backend credentials/data are unavailable, report the exact blocked browser/API checks instead of claiming them.

## Definition of done

- The FE implementation matches the BE endpoint, roles, payload and error contract.
- The mutation is reachable only from the owner appointment flow and only for the authenticated PetOwner's online order.
- Active services, validation, loading/error/conflict handling and refresh behavior are implemented.
- No unsupported appointment-service lifecycle controls are introduced.
- Existing owner booking/history, staff reception, cage management and Admin service management remain intact.
- Tests, typecheck, lint, build and browser evidence are reported accurately.
