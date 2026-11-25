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
