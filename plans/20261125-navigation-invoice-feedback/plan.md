# Navigation and invoice feedback — 25 November 2026

## Scope and acceptance criteria

Frontend only. Main was fast-forward synced before implementation (5dc34ae); no dev branch exists in this repository.

- [x] PetOwner sidebar includes “Hành trình của bé”, opening the existing dashboard journey tab. Selection survives reload.
- [x] PetOwner and Receptionist have a “Cộng đồng” sidebar item and retain their workspace layout on the community feed and post routes. No changes to interaction permissions.
- [x] Guest and PetOwner may visit the public homepage. Other authenticated roles are redirected to their workspace; no staff/admin home shortcut is added.
- [x] Login still lands every role on its own dashboard/work queue.
- [x] Owner and clinic issued-invoice lists offer Ngày / Tuần / Tháng / Tùy chọn; default Ngày. Calendar weeks are Monday–Sunday, dates use Vietnam today, and changing the period resets pagination. Custom ranges, pet/status filters and refresh remain.
- [x] New checkout offers Tiền mặt and Thanh toán QR only. FE-owned UI labels no longer expose PayOS branding; API enum/endpoints and QR cache, polling, zero-total handling and recreation confirmation remain unchanged.
- [x] Historical VNPay invoices remain readable/filterable; no backend or stored payment data is changed.

## Verification

- `npm run lint`: passed.
- `npm run build`: passed (existing large-bundle warning remains).
- `npm test`: 386 cases, 385 passed, 1 existing skipped, 0 failures.
- `python tests/verify_role_landing.py`: 8 browser tests passed, covering all login roles, homepage policy, journey sidebar click/reload and owner/reception community sidebar navigation.
- Calendar unit tests cover Sunday/Monday, year boundaries, complete months and leap day.
- `python tests/verify_invoice_feedback.py`: 11 browser tests passed. Covered owner/reception day-week-month queries and pagination, custom/cleared ranges, other filters, legacy VNPay history, cash confirmation, mounted QR/cache/polling/recreation, zero-total and paid completion.
- Invoice browser isolation: 105 API requests locally fulfilled, including 4 simulated writes; no unexpected API requests or browser runtime errors. No live BE requests.
- Manually inspected owner invoice, reception QR checkout and reception community screenshots.

All browser fixtures intercept API/XHR/fetch requests. No real customer data or live payment was created. This verifies the FE contract and UI behavior, not payment-provider connectivity or a production deployment.

## Screenshots

Local artifacts are ignored by Git under `tests/screenshots/`. Navigation screenshots: `feedback-25-owner-journey.png`, `feedback-25-community-PetOwner.png`, `feedback-25-community-Receptionist.png`.

Invoice screenshots: `feedback-25-invoices.png`, `feedback-25-checkout.png`.

## Follow-up: journey sharing and pending checkout filters

- [x] Journey view exposes the existing privacy-safe share modal for owners of active pets, plus a Community entry point.
- [x] Owners select completed milestones and submit only petId/orderIds/content through the existing service. Success explicitly means pending moderation, not publication; links open personal posts and the TimelineShare feed.
- [x] Archived pets and staff do not get owner sharing actions; empty previews disable submission; failure preserves the draft. No backend changes or moderation bypass.
- [x] Pending checkout tab now has day/week/month/custom appointment-date filters, default Vietnam today. Switching dates resets pagination; clearing the range includes old outstanding appointments; refresh preserves filters.
- [x] Invoice lookup intentionally has no issue-date filter: an unpaid bill issued earlier must still attach to its appointment. Aborted appointment responses cannot overwrite current results.

Verification after follow-up:

- Lint passed; unit tests: 385 passed, 1 existing skip, 0 failures.
- Production build passed, existing large-bundle warning only.
- Journey sharing: 6 browser cases passed (locally intercepted preview/share/feed, pending vs published, no completed visits, errors, archived pet and staff).
- Pending checkout: 4 browser cases passed, 46 intercepted API requests, no writes. Covers calendar ranges and pagination, custom/clear/refresh, admin read-only access, earlier-issued bill matching, empty results and retry.
- Existing invoice regression: all 11 browser cases passed after scoping date controls to the visible tab, avoiding hidden AntD tab content.
- Manually inspected screenshots: feedback-25-pending-filters.png and feedback-25-shared-journey.png (fictional fixtures, ignored local artifacts).
- These checks validate FE behavior and request contracts; they do not validate production BE data or payment connectivity.

Delivery uses the existing PR #58. Repository requires review and disallows auto-merge; do not bypass branch protection.
