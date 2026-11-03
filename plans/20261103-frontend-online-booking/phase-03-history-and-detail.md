# Phase 03 — Appointment history/detail

- [ ] Tách component/hook nếu cần trong `src/pages/Dashboard/components/`.
- [ ] Nối list API, filters, server pagination, pet-name mapping, status labels.
- [ ] Cập nhật/bỏ consumers cũ `activeAppointments`, `completedAppointments`, stats và live stepper; không đọc fields không có trong API hoặc gọi `Done` là SOAP.
- [ ] Nối detail API và stale-request guard.
- [ ] Giữ các luồng pet hiện tại nguyên vẹn.

Evidence: source diff, response mapping and UI behavior.
