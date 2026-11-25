# Exam pet history uses unified timeline

Base: origin/main 34730c6, pulled before implementation (no dev branch). FE only.

## Acceptance

- Preserve the button and drawer title “Tiền sử bệnh · <pet name>”.
- Replace SOAP-only drawer content with existing unified PetTimeline for the selected pet. Default All types, no status/date restrictions; server pagination exposes all available history.
- Keep clinical details (SOAP/prescriptions, care notes, subtasks, inpatient stays/logs) expandable. Never expose invoices or owner-only AI/community posts to vets.
- Load only while open; reset on account/role/pet changes; closing must not discard an unsaved exam form.
- Wider desktop drawer, accessible label and context-independent timeline title styling.

## Verification / review

- Build/TypeScript and ESLint passed. Unit: 374 passed, 1 existing skip, 0 failures (375 total). Existing large Vite chunk advisory remains.
- Browser: 5 exam/SOAP checks, including 21 milestones over two pages, non-medical care/inpatient/subtask details, invoice absence, unchanged draft after close/reopen, failure/retry/empty state and existing save/complete flows. Additional vet/groomer financial-privacy regression: 1 passed. All 6 scoped browser checks passed against the production build.
- Tests use intercepted API fixtures, not production writes. Screenshot: tests/screenshots/exam-pet-history-timeline.png.
- Reviewed locally: reuse existing service/pagination/redaction; no API/BE changes, no change to SOAP save/complete payloads.
- AgentKit CLI not installed; no automatic journal claimed.
- Delivery via feature branch and review PR; no self-approval or bypass.

## Existing broad-suite mismatch on pulled main

The owner journey suite still expects the standalone /pet-journeys list/detail flow and every /pets query to use status=All. Pulled main now redirects owner journeys into dashboard tabs, whose existing panels also request status=Active. The broad run encountered that fixture assertion plus legacy-route expectations and was stopped; it is NOT reported as passing. Related dashboard/router source and this old suite are unchanged by this branch (git diff HEAD confirmed). No assertions were weakened or skipped. Updating that older owner-flow suite is outside this vet drawer change.
