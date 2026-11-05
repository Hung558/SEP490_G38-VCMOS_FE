# Phase 06 — Verification

## Automated checks

- `npm test`
- `npm run lint`
- `npm run build`

## Contract checks

- Appointment list uses `GET /appointment-orders`.
- Check-in uses `PATCH /appointment-orders/:id/check-in` with no body.
- Assignment list/detail/create use `/cage-assignments` paths.
- Assignment create body is exactly `{ cageId, orderId }`.
- `isOnline` and `active` are serialized as query booleans.
- No `/api/api` prefix and no owner-only `/me` call from staff page.

## Role checks

- Admin: appointment list/detail only.
- Receptionist: appointment list/detail/check-in and assignment list/detail/create.
- Veterinarian/Groomer/PetOwner: blocked/redirected.
- Guest: authentication redirect.

## Failure checks

- Invalid IDs and invalid filters.
- Check-in `409` for already checked-in/cancelled/etc.
- Assignment `409` for occupied or concurrently claimed cage.
- `403`, `404`, `500` and network errors.
- Cancelled/stale requests do not overwrite current state or show false errors.

## Browser/responsive checks

If a local preview is available after implementation, verify:

- 375px mobile
- 768px tablet
- desktop
- loading, empty, retry and confirmation modal states
- no horizontal overflow beyond intended table scroll

Report only checks actually run and list blocked prerequisites accurately.
