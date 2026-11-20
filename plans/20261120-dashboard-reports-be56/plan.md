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
- [ ] Integrate dashboard workers and QA.
- [ ] Verify, review, fix and record evidence.
- [ ] Push, PR and normal merge if review requirements are met.
