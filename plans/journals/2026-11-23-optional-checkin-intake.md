# Optional check-in intake — 2026-11-23

## Root cause

The fields and optional request normalization already existed, but the check-in modal was gated behind a flag absent from the local environment and false in the example configuration.

## Change

Always show check-in symptoms and initial condition. Keep blank intake optional, enforce the existing paired-field BE contract, retain 500-character limits, and make the modal body scrollable. Walk-in and BE are unchanged.

## Evidence

Unit suite: 331 passed, 1 existing skip. Type check, lint and production build passed (existing bundle warning). Seven isolated Chromium checks pass with the intake flag false and unset; no live API writes.

## Notes

The `ak` CLI is unavailable, so this journal was written locally rather than via `ak journal create`. AgentWiki publish skipped. No commit or push; existing inpatient test edits preserved.
