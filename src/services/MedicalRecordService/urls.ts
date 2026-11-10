export const apiMedicalRecordByService = (appointmentServiceId: string) =>
  `/medical-records/service/${appointmentServiceId}`;
export const apiStartConsultation = (appointmentServiceId: string) =>
  `/medical-records/service/${appointmentServiceId}/start`;
export const apiCompleteConsultation = (appointmentServiceId: string) =>
  `/medical-records/service/${appointmentServiceId}/complete`;
export const apiPetMedicalHistory = (petId: string) =>
  `/medical-records/pet/${petId}`;
