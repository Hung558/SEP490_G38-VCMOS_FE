# Phase 01 — Contract, types, URLs and service methods

## Goal

Represent the new combined booking API accurately and provide reusable domain-service methods before changing UI.

## Files

- `src/services/AppointmentServiceService/urls.ts`
- `src/services/AppointmentServiceService/types.ts`
- `src/services/AppointmentServiceService/helpers.ts`
- `src/services/AppointmentServiceService/index.ts`
- `src/types/api/appointment.api.ts`
- `src/services/AppointmentOrderService/types.ts` if needed for owner detail response compatibility

## Work

1. Add URL constant:

```ts
export const apiCreateOnlineBooking = '/appointment-services/online-booking';
```

Keep `/appointment-services/online` for the existing add-service method.

2. Define a request model containing only `petId`, `date`, optional `note` and non-empty `services[]`.

3. Define response models for `{ message, data: { appointment, services } }`.

4. Expand owner detail service types. `serviceId` must support either an ID string or populated service object. Staff refs must support ID, populated `{ _id, fullName }`, or `null`.

5. Add payload builder that trims IDs/notes, omits undefined optional fields and explicitly maps each selected service. Never spread arbitrary objects.

6. Add typed method using the existing Axios instance. Return the already-unwrapped `response.data` shape used by this repository.

7. Preserve the single-service method, URL and types for `AddAppointmentServiceModal`.

8. Add focused unit tests for exact URL, allowed fields, omission of undefined values, malformed IDs, empty service arrays, duplicate sequences and boolean/integer validation.

## Acceptance checks

- Combined method calls `/appointment-services/online-booking`.
- Existing add-service method still calls `/appointment-services/online`.
- No request type permits or builder forwards `ownerId` or internal fields.
- Detail response accepts `services: []` and populated refs.
