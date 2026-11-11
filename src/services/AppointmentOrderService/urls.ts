export const apiOnlineBooking = '/appointment-orders/online';
export const apiMyBookings = '/appointment-orders/me';
export const apiMyBookingDetail = (id: string) =>
  `/appointment-orders/me/${id}`;
export const apiStaffAppointments = '/appointment-orders';
export const apiCheckInAppointment = (id: string) =>
  `/appointment-orders/${id}/check-in`;
export const apiCancelAppointment = (id: string) =>
  `/appointment-orders/${id}/cancel`;
