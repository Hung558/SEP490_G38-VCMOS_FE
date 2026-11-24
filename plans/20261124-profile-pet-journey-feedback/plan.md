# Account and pet journey UI feedback (2.1 + 2.2)

Base: main 4b25212, synchronized before coding. FE only; no mobile redesign or BE writes.

## Acceptance

- [x] 2.1 One primary account heading; preserve all role sections, edit and OTP flows.
- [x] 2.2 Remove Breed, move history to /pet-journeys and /pet-journeys/:petId. Owner list includes pagination and archived pets; clinical staff access only individual read-only histories.
- [x] Pet profile retains readable counters and navigation, not full timeline. Preserve sharing and legacy inpatient deep links.
- [x] Milestones collapsed by default, consistent hierarchy, Vietnamese type/status labels, remove redundant prose/payment instruction.
- [x] Active-care refresh stays background-only, retains open details, handles errors without erasing good data.
- [x] Verify filters, pagination, stale response, role/financial access, errors, existing profile actions.
- [x] Desktop screenshots of account, pet detail, journey list, collapsed/expanded timeline; provide leader review notes.

## Evidence / decisions

- Existing timeline polls every 30s for active care and replaced all content with a skeleton; retain polling for live status, remove disruptive loading swap.
- Google Drive connector not connected; prefer returning screenshots + copyable notes unless authorized UI access is available.

## Verification

- Production build / TypeScript: passed. ESLint: passed. Unit tests: 350 passed, 1 pre-existing skip, 0 failed (351 total). Existing Vite large-chunk advisory remains.
- Browser checks: 3 account + 13 journey + 3 related profile/daily-log regressions; API fixtures only, no live BE writes.
- Read-only agent review completed; compact-summary freshness finding addressed with snapshot cue + manual refresh and regression assertion.
- Broader inpatient suite: 13 passed, 1 existing admission-refresh failure outside this scope; unchanged AdmissionModal and unchanged failing test preserved. See review-notes.md.
- Desktop screenshots checked visually; real built FE with synthetic fixture data.
- AgentKit CLI unavailable (`ak` not found); no auto-journal claimed.
- Delivery: feature branch and review PR; leave merge to leader review. No self-approval or bypass.
