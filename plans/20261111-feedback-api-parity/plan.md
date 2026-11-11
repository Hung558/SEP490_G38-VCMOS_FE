---
title: FE implementation plan for verified feedback/API gaps
status: completed
created: 2026-11-11
---

# Implementation plan

## Baseline

- FE revision audited: `322019e784e3224a73b3dbbb816f7f829f2230ba`.
- BE revision audited: `b3cd61c956af8dae70a2d2e524f6bfe4f6199c29`.
- One FE-actionable gap is confirmed: one-form Dashboard booking and removal of the landing-page booking wizard.
- SOAP `waitingCageId` is supported by BE completion but is blocked for a Veterinarian picker: GET `/cages` authorizes only Admin/Receptionist. Do not implement that picker until BE supplies an authorized catalog endpoint/role.
- Existing combined booking endpoint, walk-in, appointment check-in, staff assignment/queue, cage assignment, SOAP draft/complete/history, Dashboard tabs and assigned-staff display are not rebuild targets.
- FE-only. Do not alter BE, commit, push, merge or open a PR under this plan.

## Likely files

Booking:

- `src/pages/Home/components/QuickBookingSection.tsx`
- `src/pages/Home/components/BookingServiceStep.tsx` and nearby booking child components, only as needed to compose one form
- `src/pages/Home/index.tsx`
- `src/pages/Home/components/HeroSection.tsx`
- `src/pages/Home/components/ServicesSection.tsx`
- `src/pages/Home/components/DoctorsSection.tsx`
- `src/pages/Dashboard/index.tsx` and `src/pages/Dashboard/dashboardTabs.ts` only if navigation/prefill compatibility needs adjustment
- focused tests under `tests/`

SOAP waiting cage:

- `src/pages/ExamRecord/components/SoapForm.tsx`
- `src/pages/ExamRecord/index.tsx` only if success-state reconciliation requires it
- `src/services/MedicalRecordService/helpers.ts` and service types only if a typed payload/helper change is needed
- existing `src/services/CageService/` (reuse; no new endpoint layer expected)
- `src/types/api/medical-record.api.ts` only if current type is insufficient
- focused tests under `tests/`

Do not modify unrelated modules. Final file list may narrow after inspecting existing tests and validators.

## Phases

- [x] Phase 1 — Reconfirm current BE contracts and FE callers
- [x] Phase 2 — Refactor owner booking into one Dashboard form
- [x] Phase 3 — Route landing booking CTAs into Dashboard
- [x] Phase 4 — Record the BE prerequisite for waiting-cage UI
- [x] Phase 5 — Add focused booking tests and regression verification

## Phase details

### Phase 1: Contract and caller reconfirmation

- Confirm booking combined endpoint and exact whitelist against current validator/docs.
- Confirm date/note/service validation helpers and current catalog cancellation guards; preserve them.
- Confirm `waitingCageId` validation, cage eligibility/availability constraints, omitted-vs-null behavior, and completion response.
- Trace all `QuickBookingSection` callers and all complete-payload builders before editing.

### Phase 2: One-screen Dashboard booking

- Replace four-step visibility/state with one form presenting pet, services, date, note, and final confirmation together.
- Keep the current combined booking service method, Active filtering, request cancellation/stale guards, pet prefill, duplicate-submit prevention, server errors and success callbacks.
- Use existing validation helpers for the full form and map errors to visible fields.
- Remove or adapt step-only child usage without changing unrelated service selection behavior.

### Phase 3: Landing CTA migration

- Stop rendering the full booking component on Home.
- Route signed-in PetOwner booking/service/doctor CTAs to `/dashboard?tab=appointments&book=new` or the compatible pet-specific prefill.
- Reuse current login modal/return behavior for guests; do not introduce a second auth mechanism.
- Verify direct Dashboard query params, browser back/forward and post-booked navigation.

### Phase 4: Waiting-cage backend prerequisite

- Do not implement the Veterinarian cage selector against the current GET `/cages`; route authorization only permits Admin/Receptionist.
- Record the required backend change: provide a least-privilege Available-cage catalog read for Veterinarian or authorize an appropriate endpoint after reviewing data access scope.
- After BE support lands, make a separate FE implementation plan covering pet size/isolation filtering, stale cage 409 handling, `waitingCageId` payload and returned assignment. Do not silently widen this plan.

### Phase 5: Verification

- Add focused tests for single-form validation/submission and Dashboard navigation; retain existing API behavior and verify known SOAP contract types are unchanged.
- Run FE test suite, typecheck, lint, build and `git diff --check`; report exact results.
- Inspect changed files to confirm no BE/source-independent changes or unrelated refactors.

## Dependencies and sequencing

Phase 1 precedes the implementation because cage validation details must be confirmed. Phases 2 and 3 touch the same booking component/callers and should be implemented as one coherent booking workstream. Phase 4 is independent after Phase 1 and can be developed separately, but coordinate file ownership if parallelized. Run Phase 5 only after all FE changes are integrated in the same checkout.

## Definition of done

- The one FE-actionable feedback gap satisfies `spec.md`; the SOAP cage picker remains explicitly blocked pending a BE permission/API change.
- Existing covered workflows remain intact and are not duplicated.
- Tests and build checks are executed and results recorded; no source-level audit is described as runtime certification.
- FE-only diff, no commit/push/merge/PR.
