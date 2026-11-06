# Phase 05 — Tests, typecheck, lint, build and browser verification

## Goal

Verify the implementation against the contract and existing owner flows.

## Automated checks

- `npm test`
- `npm run check-types`
- `npm run lint`
- `npm run build`

## Contract tests

- Exact endpoint path and method.
- Payload whitelist and trimming.
- Optional field omission and boolean/positive-integer validation.
- Active-service query.
- Role/eligibility helper behavior.
- Error extraction for object and string error payloads.

## Browser checks

When local BE and credentials/data are available:

- PetOwner opens an eligible online appointment and creates a service.
- Inactive service is absent from selector.
- Submit is disabled during request and duplicate click does not create duplicates.
- Duplicate sequence returns visible 409 recovery.
- Guest and non-owner roles remain blocked.
- Existing Dashboard booking/history/detail remains functional.
- Responsive 375px, 768px and desktop layouts.

If prerequisites are unavailable, report the exact unverified checks and do not claim them as passed.
