# Responsive audit and fixes — 2026-11-27

## Reproduced issues

- 390px: clinic calendar document 436px; vet/spa queues 394px; inpatient list 474px.
- 320px: account list document 378px; admin reports 357px; reception dashboard 331px.
- Opening owner booking at 320px exposed a 377px-wide document although the closed-form dashboard passed.

## Resolution

Scoped styled-components flex/grid minimum sizing, bounded internal scrolling for segmented filters, internal AntD table scrolling, responsive admin spacing and stacked phone account filters. Booking grid tracks now shrink below selected-pet text intrinsic width. Preserved all data columns and business behavior. Existing local Drawer navigation, Profile/dashboard and calendar popup improvements retained.

## Browser evidence

External directory: C:/Users/Asus/.codex/visualizations/2026/11/12/01a1d04e-499f-7f31-ba61-3978148ab5a6/responsive-audit-20261127/

- project-final.json: 88 route/viewport cases, no document overflow, off-screen measured controls or page errors; zero write attempts.
- states-verified.json: 48 opened-state/viewport cases, no action failures, document overflow, measured off-screen controls or page errors; zero write attempts.
- after.json: rerun existing 32-case owner/staff regression; all pass, zero write attempts.
- Screenshots include booking-320-states.png, user-create-320-states.png, history-320-states.png, report-operations-320-states.png, inpatient-detail-320-states.png and schedule-320-project-final.png.

Initial diagnostic scripts intentionally recorded failures. Final state runner corrected accessible-name matching for icon buttons and waits for Drawer geometry to settle before measuring; it then successfully opens all intended states. These initial diagnostic failures are not final results.

## Validation

Final `npm run lint` passed. `npm run build` passed. `npm test`: 406 total, 405 passed, 1 existing skip, 0 failed (7 responsive source-contract tests). Aggregate final browser evidence assertion: 168/168 cases passed, zero write attempts. Build retains the existing large-chunk advisory (~2.45 MB JS). Source-contract tests cover the layout guards but do not prove runtime responsive behavior on their own.

## Limits

Mocked Chromium layout QA, not live integration or every device/browser/state. No business writes sent; no backend edits. Local branch only; not committed/pushed/merged in this pass.
