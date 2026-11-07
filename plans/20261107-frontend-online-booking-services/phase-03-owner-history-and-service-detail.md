# Phase 03 — Owner history and service detail

## Goal

Make the owner appointment detail reflect the new backend response and remain safe for populated/unpopulated references.

## Files

- `src/types/api/appointment.api.ts`
- `src/services/AppointmentOrderService/types.ts`
- `src/pages/Dashboard/components/AppointmentDetailModal.tsx`
- `src/pages/Dashboard/index.tsx` only for refresh/integration wiring

## Work

1. Keep list/detail requests on `/appointment-orders/me` and `/appointment-orders/me/:id`.

2. Update detail typing so `data.services` is always representable, including `[]`. Do not make service refs mandatory objects because list/create responses may contain IDs.

3. In `AppointmentDetailModal`, render a read-only service section sorted by backend order. Show sequence, service name/code/category, duration/price when available, appointment-service status and emergency marker.

4. Render preferred/assigned staff names only when populated. If only an ID exists, use a neutral fallback rather than making a second unsupported request.

5. Render an explicit empty state when `services.length === 0`.

6. Preserve existing detail loading, retry, cancellation, persisted-user fallback and PetOwner add-service action.

7. After successful create/add-service, refresh the detail endpoint so the modal shows server truth. Avoid overwriting a newer selected appointment with a stale response.

## Acceptance checks

- Detail renders populated `serviceId` objects correctly.
- Detail tolerates string IDs/null refs.
- Services are displayed read-only and no unsupported lifecycle controls appear.
- Owner reads never use staff-wide `/appointment-orders`.
