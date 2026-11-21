# BE #56 — role dashboards: plan and specification

## Scope and baseline

- FE baseline: dcad580 (PR #44 merged). BE baseline: caba3c1 (PR #56 reports, includes #55).
- FE desktop only. No backend changes, mobile redesign or unrelated community-feed expansion.
- Owner dashboard, vet/groomer queues, existing best-selling report remain available.

## Navigation and ownership

- Admin landing `/admin/reports`: revenue and operational analytics plus existing product report.
- Receptionist landing `/clinic/dashboard`: current workload, selected-period statistics, next actions.
- Admin may also open front-desk overview; PetOwner/Veterinarian/Groomer may not request reports.
- Preserve booking shortcuts and existing appointment reception workflow.
- Coordinator: routes/menu/landing/spec/integration. `code`: ReportService + AdminReports.
- `Lập plan và code phần FE`: FrontDeskDashboard. `Run testing and web QA`: isolated mocked E2E.
- Workers use separate branches/worktrees from the pinned baseline; coordinator integrates commits.

## API contract

Use bare response JSON through existing axios interceptor, domain service + urls.ts.

- GET /reports/revenue: Admin, default month; day/week/month/custom and revenue-only groupBy day/month.
- GET /reports/operations: Admin, default month; same period filters, no groupBy.
- GET /reports/front-desk: Admin/Receptionist, default day.
- Presets are server Vietnam calendar periods. Server echoed from/to are authoritative.
- Custom dates must be real YYYY-MM-DD calendar days, ordered, maximum 366 inclusive days.
- Cancel old requests and reject stale responses after filter, refresh or account/role changes.
- Fail closed for report roles; never preserve another account's visible report or fake zero on errors.

## Admin presentation / acceptance

1. Revenue KPIs: paid revenue/count/average; previous comparable range, revenue and count; nullable percent change means no comparison basis, never invented 100%.
2. Server zero-filled revenue series: readable series/table, revenue-only aggregation selection.
3. Payment methods: amounts/counts/share. Service categories: amounts/item counts/share; share denominator is service subtotal, NOT overall revenue. Item types: amounts/count/share.
4. Operations: appointment status counts, online/walk-in counts/rates, completion/overdue/cancellation rates.
5. All category service totals/done, top services rank/code/name/category/count/done.
6. Current cage totals, zones, isolation and occupancy; current global customer/pet/product counts explicitly labeled snapshots independent of selected dates.
7. Existing best-selling products retained, no accidental duplicate finance fetching from invoice lists.

## Front-desk presentation / acceptance

1. `expectedToday` = only Booked appointments today, labeled unreceived bookings, NOT all today's appointments.
2. checkedInNow/inProgressNow/waitingForPickup are live across all appointment dates; always labeled accordingly.
3. Current cages: totals/free/occupied/rate; zone and isolated totals.
4. Selected period: appointment total/statuses, online/walk-in, average wait and sample count. Null average renders no samples, not zero minutes.
5. Invoice issuedCount and unpaidCount use issuedAt; paidCount/totalCollected use paidAt; do not divide mismatched cohorts into a conversion rate.
6. Payment method amounts and invoice counts. Explain period vs live snapshots without jargon.
7. Clear next actions to existing appointment/cages/invoices/walk-in screens, only supported links/query parameters.

## Common UX / quality

- Loading, empty, errors and retry/refresh; explicit filter labels and active server range.
- Desktop visual hierarchy: today/live workload first, next action visible, details below.
- Accessible labels, semantic headings/tables; untrusted API names rendered as escaped text.
- Direct AntD and styled-components; no new dependencies, no shared custom input wrappers.

## Verification / shipping gates

- Focused contract/date/role tests plus complete node suite, actual tsc -b, lint, production build.
- Browser E2E with synthetic reports only; strict owned loopback preview and unexpected network guards.
- Verify admin/reception flows, zero/null/error/retry/role denial, custom date boundaries and stale-response safeguards.
- Independent code review and fixes; update this plan with exact evidence and limitations.
- Conventional commits -> feature push -> PR attached to this chat -> ordinary policy-compliant merge.
- Never self-approve, use --admin or bypass required review; report pending review accurately.

## Progress

- [x] Fetch/pull both main branches safely and inspect actual BE report contract.
- [x] Dispatch disjoint workers; integrate navigation and landing rules.
- [x] Integrate dashboard workers and QA.
- [x] Verify, review, fix and record evidence.
- [ ] Push, PR and normal merge if review requirements are met.

## Verification log (in progress)

- Initial navigation baseline: 287/287 node tests passed.
- Integration 95ff375: actual `tsc -b` passed; unit suite 305 passed, 1 opt-in browser harness skipped, 0 failed (306 total).
- Opt-in Chromium harness explicitly enabled on integration: 13/13 passed, including auth remount, cancelled requests, late responses and no fabricated metrics on errors.
- Independent front-desk review against BE caba3c1: no confirmed P0–P2 findings. Full-app browser suite remains a separate gate.
- Admin first-pass review found misleading missing-data zeros, missing groupBy control, missing explicit late-response guard and ambiguous null/comparison/live labels. Follow-up implementation is in progress; these are NOT marked resolved before reinspection.
- Main report service now preserves BE series verbatim, strips stale custom dates from presets, and sends groupBy only to the revenue endpoint.
- GitHub main ruleset 25630747 is active and requires one approving review. No bypass/self-approval will be used.

### Review resolution and final source gate (49ba962)

- Resolved admin report zero-on-error displays, explicit late-response guards, identity-remount and refresh invalidation. Revenue grouping control and bucket invoice counts are exposed.
- Resolved misleading live/date/null/cage labels and completed both front-desk zone availability fields. Invoice issued/unpaid counts and paid counts/collections now explicitly identify their different date cohorts.
- Resolved retained best-selling card stale rows after failed filter changes: complete query/revision keys, request cleanup, clear snapshots before retries and abort checks.
- Independent reviews covered actual BE contract, route integration, front-desk implementation, AdminReports and ReportService. No required finding remains knowingly unaddressed; final browser verification pending below.
- Final source gate: `npm test` 305 passed, 1 explicitly opt-in browser case skipped, 0 failed; `npx tsc -b --pretty false`, `npm run lint`, `VITE_API_ROOT=/api npm run build` passed.
- Build warning remains: generated main JS chunk ~2.28 MB minified. No dependency was added and the warning is not suppressed. Bundle splitting is follow-up scope, not a failed build.
- Scope remains FE-only: BE working tree is clean on caba3c1. No production API writes were used for testing.

## Final desktop browser verification — 2026-11-20

- Full production-preview/router/service integration: 13/13 Chromium tests passed at isolated http://127.0.0.2:3000, with every API intercepted and unexpected traffic rejected. No live BE or production writes.
- Coverage: all three report endpoints; revenue-only groupBy query; presets without stale custom query values; receptionist default day/custom validation; Admin and receptionist access; forbidden owner/vet/groomer redirects without report fetches; null wait samples vs zero; independent API failures/retry without old revenue; retained best-selling failed-filter/retry regression; escaped service names and desktop layout.
- Separate front-desk browser/component harness: 13/13 passed, including auth identity replacement, abort/late response protection and live/period semantics.
- Unit suite: 305 passed, 1 explicitly opt-in browser test skipped in the default run. That browser test was exercised separately above. TypeScript, lint and production build passed again after final UI text cleanup.
- Desktop screenshots reviewed: tests/screenshots/reports-admin-desktop.png and tests/screenshots/reports-front-desk-desktop.png (local ignored evidence, synthetic data only).
- Initial worker E2E failures were not treated as passes: corrected outdated fixtures, accessible selectors and route-denial expectations, then reran the full suite successfully. Product fixes are listed above.
- Test display data uses realistic Vietnamese names, not E2E/QA labels. Malicious markup is isolated to the explicit escaping test, not the normal preview dataset.
- Remaining limitation: mocked API integration, not a live database end-to-end acceptance run. Build retains the existing large-chunk warning.
- GitHub main ruleset 25630747 requires one approving review. Publishing uses a feature branch and PR; no self-approval or admin/protection bypass is permitted.

## Publication receipt

- Pushed feature branch feat/role-dashboards-be56 and opened PR #45: https://github.com/Hung558/SEP490_G38-VCMOS_FE/pull/45.
- Verified application/test commit da331ea3598cac647ee47bc18e4b7bf9541319fd. Subsequent publication-receipt commit changes documentation only.
- GitHub reports OPEN / BLOCKED / REVIEW_REQUIRED; normal merge attempt was rejected by main protection. No remote CI checks were configured/reported in this PR snapshot; local checks above are the verification evidence.
- Remaining shipping step: one external approving review, then normal merge. Auto-merge is disabled for this repository. No branch-protection changes or admin bypass performed.
