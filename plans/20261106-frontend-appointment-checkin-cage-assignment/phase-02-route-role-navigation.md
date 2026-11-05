# Phase 02 — Route, role access and navigation

## Goal

Create a staff-facing appointment entry point while preserving owner Dashboard and enforcing the exact BE role matrix.

## Requirements

- Add a stable route such as `/clinic/appointments`.
- Route guard allows exact normalized `Admin` and `Receptionist` for the appointment list.
- Assignment panel/actions are rendered only for exact `Receptionist`.
- Check-in action is rendered only for exact `Receptionist`.
- Veterinarian, Groomer, PetOwner and guest are redirected using existing landing behavior.
- Add menu/breadcrumb entries for the chosen route without exposing assignment controls to Admin.
- Do not reuse `RoleRoute allow={['staff']}` because that includes Veterinarian and Groomer.
- Do not move owner Dashboard under this route or change its `/appointment-orders/me` behavior.

## Acceptance

- Direct URL and menu behavior match the matrix for all known roles.
- Admin can read appointments but cannot see check-in or assignment-create actions.
- Receptionist can see the full operational controls.
