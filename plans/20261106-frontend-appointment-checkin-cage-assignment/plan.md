---
title: Frontend appointment reception, check-in and cage assignment
status: complete
created: 2026-11-06
---

# Plan — FE tiếp nhận lịch hẹn, check-in và phân chuồng

## Baseline

- BE current HEAD: `9e3442c`.
- Relevant BE commits: `c1e313b` check-in, `373dd8b` list all bookings, `d612e2a` cage assignment.
- Canonical spec: `plans/20261106-frontend-appointment-checkin-cage-assignment/spec.md`.
- Existing FE cage module: `src/services/CageService/`, `src/pages/Cages/`.
- Existing owner appointment module: `src/services/AppointmentOrderService/`, `src/pages/Dashboard/`.

## Constraints

- Plan/spec only in this phase; do not implement code until explicitly requested.
- Follow `ai_coding_rule.md`: direct AntD, styled-components where needed, domain services, page child files under `components/`.
- Use existing Axios instance and relative service paths; never add a second `/api` prefix.
- Exact role rules: appointment list `Admin/Receptionist`; check-in and all cage-assignment routes `Receptionist` only.
- Use `normalizeRole`; do not rely on generic `staff` group.
- Do not modify BE, auth middleware, Axios interceptor or owner Dashboard behavior.
- Do not add dependencies or commit/push during implementation unless requested.

## Phases

- [x] Phase 01 — Contract types and services
- [x] Phase 02 — Staff route, role guard and navigation
- [x] Phase 03 — Staff appointment list, filters and detail
- [x] Phase 04 — Receptionist check-in workflow
- [x] Phase 05 — Cage assignment list, detail and create workflow
- [x] Phase 06 — Race/error handling and verification

## Phase 01 — Contract types and services

- Extend appointment types with populated staff list item types while allowing legacy string references.
- Add service URLs and typed methods for:
  - `GET /appointment-orders`
  - `PATCH /appointment-orders/:id/check-in`
  - `GET /cage-assignments`
  - `GET /cage-assignments/:id`
  - `POST /cage-assignments`
- Add query builders that whitelist documented values and omit empty filters.
- Add payload builder for assignment that sends only `cageId` and `orderId`.
- Add shared error extraction for object/string `errors[]`, status and message without changing global interceptor.
- Forward optional Axios `signal` for read requests.

## Phase 02 — Staff route, role guard and navigation

- Add a dedicated staff appointment route, separate from owner Dashboard.
- Allow exact normalized `Admin` and `Receptionist` for appointment list.
- Keep assignment controls and assignment service calls Receptionist-only.
- Add menu/breadcrumb entries according to the chosen route.
- Block Veterinarian, Groomer, PetOwner and guest at route level; preserve existing landing behavior.
- Do not expose cage-assignment controls on the Admin-only/Receptionist-readable cage-management page unless the page is intentionally integrated and guarded exactly.

## Phase 03 — Staff appointment list, filters and detail

- Build appointment table with code, appointment date, pet, owner, phone, source, status and check-in time.
- Add server-side filters: status, online/walk-in, exact code, date range; support pagination and page-size limits.
- Add loading, empty, error/retry and refresh states.
- Add detail drawer/modal using the staff list item or a dedicated existing detail pattern; do not call owner-only `/me/:id` for staff data.
- Resolve populated references safely and show fallback IDs for legacy string values.
- Preserve filters/page after refresh and mutation.

## Phase 04 — Receptionist check-in workflow

- Render check-in only when exact role is Receptionist and row status is `Booked`.
- Confirm appointment identity before request; send `PATCH` with no body.
- Disable affected action during request and prevent double click.
- Apply returned appointment or refresh current page after success.
- On 409, show server message and refresh current page to reflect concurrent check-in.
- Admin remains read-only.

## Phase 05 — Cage assignment list, detail and create workflow

- Render assignment area only for Receptionist.
- List assignments with `active`, `cageId`, `orderId` filters and newest-first server result.
- Add assignment detail modal/drawer showing populated cage/order/operator and timestamps.
- Load available cages through existing `CageService.listCages({ status: 'Available' })` with cancellation protection.
- Create form sends only `{ cageId, orderId }`; order can be prefilled from an appointment row.
- On success refresh assignments and available cage options; use returned object for feedback.
- On 409 refresh availability and assignment list; preserve selected order where possible.
- No update/delete/release/transfer controls.

## Phase 06 — Race/error handling and verification

- Add AbortController/request-sequence guards to list, detail and available-cage requests.
- Ignore cancelled/stale responses and avoid stale toasts.
- Verify role matrix: Admin, Receptionist, Veterinarian, Groomer, PetOwner, guest.
- Verify exact network paths, query serialization and body whitelist.
- Verify check-in 409 race behavior and assignment 409 availability race behavior.
- Run `npm test`, `npm run lint`, `npm run build`.
- Verify responsive states at 375px, 768px and desktop if a browser-previewable page is implemented.
- Report any blocked BE/auth/credential prerequisite instead of claiming unrun checks.

## Definition of done

- All documented endpoints are represented by typed services with exact paths and payloads.
- Admin/Receptionist appointment access and Receptionist-only mutation/access rules are enforced in UI and route guards.
- Check-in and assignment flows use server truth, handle conflicts safely and do not invent unsupported lifecycle actions.
- Existing owner booking, Dashboard and cage-management flows remain unchanged.
- Tests/lint/build/browser checks are reported accurately after implementation.
