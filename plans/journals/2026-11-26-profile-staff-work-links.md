# Profile staff work links — 26 November 2026

## Scope and result

Frontend-only shortcuts requested for Receptionist, Veterinarian and Groomer. Synced main before edits (1462492, already up to date; repository has no dev branch). No new work screens or backend changes.

- All 13 role-specific work rows now have a required route instead of a development placeholder.
- Reception shortcuts: front-desk dashboard, shared appointment calendar, walk-in dialog, cage board, invoices, customer lookup.
- Vet SOAP/lab work and groomer care/subtasks open the authorized case queue; no invented case IDs. Vet inpatient shortcut opens inpatient care.
- All three roles have a functional work-schedule link. Removed the obsolete message saying scheduling is not implemented.
- Reception tabs support tab=schedule/tab=lookup with URL-driven state, reload/back navigation, and unknown-tab fallback. Existing walk-in query behavior remains.
- Descriptive accessible names distinguish each work link.

## Verification

- Unit suite: 399 cases, 398 passed, one existing skipped, zero failures.
- Lint and production build passed; existing large-bundle warning remains.
- Five browser tests passed, including clicking all 13 work links, all three role schedule links (systemRole fallback), reception deep-link reload/back and invalid-tab fallback.
- All browser API traffic intercepted; no API writes or live BE calls. Fictional fixture names only. This validates FE navigation, not production data.
- Screenshots inspected under ignored tests/screenshots/profile-work-links-<role>.png.

## Journal

The stale work-link map predated the implemented work modules. Reused existing route constants and made paths required to prevent future missing shortcuts. Clinic case-specific tools still require staff to select a case, preserving authorization context. The AgentKit CLI is unavailable, so this journal was written directly. AgentWiki publish skipped.
