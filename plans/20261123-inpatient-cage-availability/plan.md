# Inpatient cage availability diagnosis — 2026-11-23

## Scope and status

- FE only; no BE/database writes and no mobile work.
- FE baseline: main 68c34ee. BE inspected: main 990aad1.
- Implementation and local verification complete. Actual tester response and database configuration remain unverified; this change does not claim to repair incorrectly classified cages.

## Confirmed evidence

1. AdmissionModal fetches all available cages in pages of 100, then filters InpatientWard + Available + explicit maxWeightKg when pet weight is known.
2. BE inpatientRecord.service.js enforces that same ward and explicit weight contract. Allowing Holding cages in FE would only defer failure to admission POST.
3. BE models/Cage.js defaults zone to Holding. validators/cage.validator.js create/update pick label, size, isIsolated, status only; zone and maxWeightKg are discarded. Pure validator execution with zone InpatientWard and maxWeightKg 15 confirmed both fields disappear (no database access).
4. Thus a cage named “nội trú” can still be Holding. This is a plausible explanation, not proof of the tester's exact data.

## Acceptance criteria — verified locally

- Differentiate genuinely empty API inventory, free holding/unclassified cages, weight-incompatible ward cages, and request errors.
- Display snapshot counts without claiming all database cages are full.
- Show zone in cage management and zone/explicit weight limit in cage detail, read-only.
- Preserve admission safety filtering; support page-two wards, refresh, successful admission, and 409 conflict/input retention.
- Use natural names in browser fixtures. All API traffic mocked and unexpected calls blocked; no real customer/test records created.

## Verification

- Red phase: new helper tests failed before implementation; then 5/5 inpatient unit tests passed.
- npm test: 329 passed, 1 skipped, 0 failed (330 total).
- npm run lint: passed.
- npx tsc -b --pretty false: passed.
- VITE_API_ROOT=/api npm run build: passed (large-bundle advisory remains).
- Desktop Chromium production preview: 12/12 inpatient browser tests passed, including 4 new regression scenarios. Initial rerun exposed fixture text equal to a field label after removing QA suffixes; replaced with natural clinical text, then full suite passed.
- Screenshot inspected: tests/screenshots/inpatient-cage-classification.png (ignored local output).

## Backend/data follow-up (not implemented)

- Obtain GET /api/cages?status=Available response from the affected environment; inspect \_id, label, zone, status, maxWeightKg and the pet's weight, without sharing customer information.
- BE owner should support and validate zone/maxWeightKg on cage create/update and reconcile existing cage classifications through an authorized data procedure.
- Until then FE must not infer zone from label or mark every available cage as inpatient.
