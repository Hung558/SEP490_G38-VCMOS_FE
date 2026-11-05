# Phase 01 — Contract, types and services

## Goal

Expose the new BE contract through typed domain services without changing the existing Axios interceptor or owner booking behavior.

## Files

- `src/services/AppointmentOrderService/urls.ts`
- `src/services/AppointmentOrderService/index.ts`
- `src/services/AppointmentOrderService/helpers.ts`
- `src/services/CageAssignmentService/urls.ts`
- `src/services/CageAssignmentService/index.ts`
- `src/services/CageAssignmentService/types.ts`
- `src/services/CageAssignmentService/helpers.ts`
- `src/types/api/appointment.api.ts`
- `src/types/api/cage-assignment.api.ts`
- `src/types/api/index.ts`

## Requirements

1. Add exact relative URLs:
   - `/appointment-orders`
   - `/appointment-orders/:id/check-in`
   - `/cage-assignments`
   - `/cage-assignments/:id`
2. Add list-all appointment params and populated response types.
3. Keep owner appointment types/services working unchanged.
4. Add check-in method with no request body.
5. Add assignment list/detail/create methods; create payload is only `{ cageId, orderId }`.
6. Serialize `isOnline` and `active` as query strings `true`/`false`.
7. Drop invalid/empty values; do not send `assignedById`, status, timestamps or populated objects.
8. Support optional `AbortSignal` on reads.
9. Map BE error response without assuming all `errors[]` entries have the same shape.

## Acceptance

- Service tests assert exact path, method, query and body.
- No `/api/api` path is generated.
- Existing `/me` and `/me/:id` owner calls remain unchanged.
