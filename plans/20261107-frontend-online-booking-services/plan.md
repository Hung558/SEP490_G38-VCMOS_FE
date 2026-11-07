---
title: Frontend combined online booking with appointment services
status: planned
created: 2026-11-07
---

# Implementation plan

## Baseline

- Repository: `SEP490_G38-VCMOS_FE`.
- Backend baseline: `main` at `9b6719f`.
- New combined mutation: `POST /api/appointment-services/online-booking`.
- Existing add-service mutation retained: `POST /api/appointment-services/online`.
- Owner reads remain `GET /api/appointment-orders/me` and `GET /api/appointment-orders/me/:id`.
- Existing active catalog is `ServiceService.listServices({ status: 'Active' })`.
- This plan is FE-only. Do not modify BE, commit, push, merge or create a PR unless separately authorized.

## Files likely affected

- `src/services/AppointmentServiceService/urls.ts`
- `src/services/AppointmentServiceService/types.ts`
- `src/services/AppointmentServiceService/helpers.ts`
- `src/services/AppointmentServiceService/index.ts`
- `src/services/AppointmentOrderService/types.ts`
- `src/services/AppointmentOrderService/index.ts` only if shared detail types require it
- `src/types/api/appointment.api.ts`
- `src/pages/Home/components/QuickBookingSection.tsx` and child components if extracted
- `src/pages/Dashboard/components/AppointmentDetailModal.tsx`
- `src/pages/Dashboard/index.tsx`
- existing tests under `tests/`

Keep unrelated staff/cage/Admin files untouched.

## Phases

- [ ] Phase 01 — Contract, types, URLs and service methods
- [ ] Phase 02 — Active catalog and combined booking form
- [ ] Phase 03 — Owner detail and returned service rendering
- [ ] Phase 04 — Existing appointment add-service compatibility
- [ ] Phase 05 — Errors, role fallback, reconciliation and regression safety
- [ ] Phase 06 — Verification and handoff evidence

## Dependency order

Phase 01 must land first because UI work depends on typed request/response models. Phases 02 and 03 can be implemented independently after the contract work. Phase 04 must preserve the existing single-service endpoint while Phase 02 changes initial booking. Phase 05 reconciles all callers and role gates. Phase 06 runs only after source changes are complete.

## Definition of done

- Initial booking uses only `/appointment-services/online-booking` and requires at least one active service.
- Existing appointment add-service continues using `/appointment-services/online`.
- Owner detail types and UI expose `services[]` without assuming refs are always populated.
- PetOwner gating uses normalized `role || systemRole` with persisted-user fallback.
- No forbidden/internal fields or `ownerId` are sent.
- Tests/typecheck/lint/build are run and their actual results are recorded.
- No backend or git history changes are made by the implementation task.
