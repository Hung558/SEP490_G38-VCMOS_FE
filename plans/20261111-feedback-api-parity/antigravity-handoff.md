# Antigravity handoff

## Task

Implement the one FE-actionable gap in `spec.md` and `plan.md`: replace the PetOwner four-step booking wizard with one form in Dashboard appointments, and route landing booking CTAs to that Dashboard form.

The SOAP waiting-cage control is explicitly blocked: BE accepts `waitingCageId` at completion, but its cage-list route permits only Admin/Receptionist, not Veterinarian. Do not implement a picker until BE provides a least-privilege catalog API or changes authorization.

## Before editing

- Read `spec.md` and `plan.md` in full.
- Confirm worktree is at FE branch/revision the user intends; do not switch branches, fetch, merge, commit, push or modify BE under this task.
- Re-read current BE booking validator/service and trace all callers/tests before changing shared booking component behavior.
- Do not implement SOAP cage selection: current BE `GET /api/cages` returns authorization denial for Veterinarian; track it as a backend prerequisite.

## Preserve

- `POST /appointment-services/online-booking` combined owner booking and its payload whitelist.
- Active-only service catalog, abort/stale request protection, initial pet/note prefill and existing Dashboard callbacks.
- Owner-scoped booking reads and assigned-staff display.
- Walk-in, receptionist check-in, staff assignment, queues, cage assignment management, SOAP field rules, medical history and finalized-record locking.
- Existing auth/login behavior for guests; do not create a new authentication path.

## Do not do

- Do not create a Veterinarian cage picker against the currently unauthorized GET `/api/cages` endpoint.
- Do not rebuild flows listed as already integrated in the coverage matrix.
- Do not implement AI functionality; the feedback is satisfied by a dedicated Dashboard tab and the current tab already exists.
- Do not change BE, add dependencies, broaden into unrelated API parity, or claim E2E validation without running it.

## Handoff evidence

Return changed paths, focused test coverage, exact results for tests/typecheck/lint/build, any verified contract divergence, and any deferred item. Keep all changes FE-only and uncommitted.
