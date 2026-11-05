# Phase 03 — Staff appointment list, filters and detail

## Goal

Give Admin and Receptionist a server-backed view of every appointment.

## Table

- Code
- Appointment date
- Pet name with safe ID fallback
- Owner name and phone
- Online/walk-in source
- Status
- Checked-in timestamp
- Actions

## Filters

- Status
- Online/walk-in
- Exact appointment code
- Date range (`from`, `to`)
- Server page and page size

Only send documented query keys. Reset filters and filter changes return to page 1.

## Detail

- Display appointment, pet, owner, note, source, status and check-in timestamp.
- Use populated fields from the staff list response; do not call owner-only detail endpoints.
- Add stale-response protection if a separate detail request is introduced.

## States

- Initial/loading
- Empty with no filter
- Empty with active filter
- Retryable API/network error
- Refreshing while preserving last valid table data

## Acceptance

- List renders both online and walk-in records.
- Pagination and filters match server totals.
- Admin and Receptionist see the same read data; mutation controls differ by role.
