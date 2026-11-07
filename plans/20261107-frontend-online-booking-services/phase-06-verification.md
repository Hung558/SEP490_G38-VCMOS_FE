# Phase 06 — Verification

## Automated checks

Run from `SEP490_G38-VCMOS_FE` and record exact output/status:

```bash
npm test
```

```bash
npm run check-types
```

```bash
npm run lint
```

```bash
npm run build
```

Also inspect the final diff for accidental edits to backend files, generated files, credentials or unrelated modules.

## Browser-preview checks

Only run browser verification when the implementation is present and a frontend preview/backend session is available:

1. PetOwner opens booking form and sees only Active services.
2. Empty service selection blocks submit.
3. One-service booking submits the combined endpoint and displays appointment code.
4. Multi-service booking preserves order and displays returned service summary.
5. Duplicate appointment date returns `409` without clearing the form.
6. Duplicate sequence returns `409` or client validation without clearing selections.
7. Owner detail renders `services[]`, populated service names and empty state.
8. Existing AddAppointmentServiceModal still calls the single-service endpoint.
9. Guest/non-PetOwner does not see or invoke owner mutations.
10. Responsive layouts work at 375px, 768px and desktop.
11. Console/network checks show no uncaught errors and no forbidden request fields.

If credentials or backend data are unavailable, state exactly which checks were blocked. Never claim browser/network evidence that was not observed.

## Final handoff evidence

Report:

- files changed;
- endpoint mapping;
- tests/typecheck/lint/build results;
- browser checks and any blocked checks;
- confirmation that no backend or git operation was performed.
