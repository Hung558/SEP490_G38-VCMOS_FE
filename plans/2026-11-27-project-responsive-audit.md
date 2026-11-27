# Project-wide responsive pass — 2026-11-27

## Scope and source state

Frontend only. Fetched origin/main and fast-forward checked before coding: already current at 46e5b99 (PR62). Continued the existing uncommitted responsive work on fix/responsive-staff-owner-screens-20261127, preserving it. No backend/API, role authorization, or clinical/payment rule changes. No push or PR created in this pass.

## Completed work

- [x] Route inventory and source sync.
- [x] Public home/auth/community and representative post-detail, payment-return error, and not-found views.
- [x] Admin account/service/product/moderation/report views; create dialogs; revenue, operations, front-desk report tabs.
- [x] Reception overview, appointment list/calendar/customer lookup, walk-in modal, cages.
- [x] Vet/spa queues, schedules, SOAP and prescription row, history drawer, subtask dialog, inpatient list/detail drawer.
- [x] Owner dashboard, booking form, pet profile, AI, post editor; regression of Profile/journey/community/invoices.
- [x] Fix reproduced overflow, remeasure viewport bounds, inspect screenshots.
- [x] Lint/build/unit checks and evidence journal (see final validation results there).

## Fixes in this pass

- Account table scrolls internally; phone filters fill available width and card padding shrinks.
- Admin services card spacing and product search minimum width adapt to phones.
- Shared clinical flex controls can shrink; long segmented filters scroll inside their own control instead of widening the page.
- Inpatient table retains all columns inside horizontal table scrolling.
- Admin/reception report period filters stay within their containers.
- Embedded booking grid uses minmax(0, 1fr) and shrinking form children; fixes a reproduced 377px document at a 320px viewport.

## Evidence and limits

Chromium with intercepted fictional API responses; all writes blocked. Main route matrix: 22 views × 320/390/768/1366 = 88 cases. Additional state matrix: 16 states × 320/390/1366 = 48 cases. Existing owner/staff regression rerun separately (32 cases). Browser scripts/results/screenshots stay outside the repository, respecting PR62 removal of Python browser helpers.

This is a broad responsive layout pass, not certification of every possible dataset or interaction. No real-device Safari/iOS, camera/file picker, successful payment, OTP email delivery, real clinical saves, or all permission/data permutations tested. Several list views use empty fixtures; reports, account list, appointment list and SOAP include populated fixtures. Table/schedule horizontal scrolling is intentional; no document overflow hiding added. New source-contract tests are complementary to—not a replacement for—browser checks.
