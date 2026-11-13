export const apiOnlineAppointmentService = '/appointment-services/online';
export const apiCreateOnlineBooking = '/appointment-services/online-booking';
export const apiOrderServices = '/appointment-services';
export const apiAssignStaff = (id: string) =>
  `/appointment-services/${id}/assign-staff`;
export const apiCancelAppointmentService = (id: string) =>
  `/appointment-services/${id}/cancel`;
export const apiMyQueue = '/appointment-services/my-queue';
export const apiStartAppointmentService = (id: string) =>
  `/appointment-services/${id}/start`;
export const apiCompleteAppointmentService = (id: string) =>
  `/appointment-services/${id}/complete`;
export const apiGroomingNote = (id: string) =>
  `/appointment-services/${id}/grooming-note`;
export const apiMyGroomingNotes = '/appointment-services/my-grooming-notes';
