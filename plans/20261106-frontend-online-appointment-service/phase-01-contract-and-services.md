# Phase 01 — Contract types, URLs, payload helpers and service method

## Goal

Represent the BE appointment-service creation contract in typed FE domain services without changing the global Axios layer.

## Inputs

- `POST /api/appointment-services/online`
- Existing `AppointmentOrderService`, `ServiceService`, Axios response unwrapping and API error helpers.

## Tasks

1. Add URL constant `/appointment-services/online`.
2. Add request/response types for appointment-service creation.
3. Add payload builder that trims IDs, includes optional `sequenceNo`/`isEmergency`, and drops all unknown/forbidden fields.
4. Add validation helpers for ObjectId and positive integer sequence.
5. Add service method using `api.post` with no duplicate `/api` prefix.
6. Add optional AbortSignal support to active service list reads if the existing method does not already provide it.
7. Add tests for exact URL, whitelist, optional omission and invalid inputs.

## Acceptance

- Service method maps exactly to `POST /appointment-services/online`.
- Payload cannot include `ownerId` or internal appointment-service fields.
- Types reflect BE defaults and response shape.
- Existing owner booking methods remain unchanged.
