export const apiOnlineAppointmentService = '/appointment-services/online';
export const apiCreateOnlineBooking = '/appointment-services/online-booking';
export const apiOrderServices = '/appointment-services';
export const apiAssignStaff = (id: string) =>
  `/appointment-services/${id}/assign-staff`;
