import api from '../01_axios';
import {
  apiOnlineAppointmentService,
  apiCreateOnlineBooking,
  apiOrderServices,
  apiAssignStaff,
} from './urls';
import {
  buildCreateOnlineAppointmentServicePayload,
  buildCreateOnlineBookingPayload,
} from './helpers';
import type {
  CreateOnlineAppointmentServicePayload,
  CreateOnlineAppointmentServiceResponse,
  CreateCombinedOnlineBookingPayload,
  CreateCombinedOnlineBookingResponse,
  ListOrderServicesResponse,
  AssignStaffResponse,
} from './types';

/**
 * Đặt lịch online kèm dịch vụ cho chủ nuôi
 * POST /api/appointment-services/online-booking
 *
 * Tạo một lượt hẹn và các dịch vụ trong cùng 1 request.
 */
const createOnlineBooking = (
  data: CreateCombinedOnlineBookingPayload
): Promise<CreateCombinedOnlineBookingResponse> => {
  const payload = buildCreateOnlineBookingPayload(data);
  return api.post(apiCreateOnlineBooking, payload);
};

/**
 * Tạo dịch vụ cho lịch hẹn online của chủ nuôi
 * POST /api/appointment-services/online
 *
 * Chỉ dành cho PetOwner tạo trên chính lịch hẹn online hợp lệ của mình.
 */
const createOnlineAppointmentService = (
  data: CreateOnlineAppointmentServicePayload
): Promise<CreateOnlineAppointmentServiceResponse> => {
  const payload = buildCreateOnlineAppointmentServicePayload(data);
  return api.post(apiOnlineAppointmentService, payload);
};

/**
 * Lễ tân / Admin xem các dịch vụ của một lịch hẹn (sắp theo sequenceNo)
 * GET /api/appointment-services?orderId=
 */
const listOrderServices = (
  orderId: string,
  options?: { signal?: AbortSignal }
): Promise<ListOrderServicesResponse> =>
  api.get(apiOrderServices, {
    params: { orderId: orderId.trim() },
    signal: options?.signal,
  });

/**
 * Lễ tân phân công Bác sĩ / Groomer cho một dịch vụ trong lịch hẹn.
 * Lịch đã check-in (hoặc đang thực hiện) thì dịch vụ vào hàng đợi: Waiting + queueNo
 * PATCH /api/appointment-services/:id/assign-staff
 */
const assignStaff = (
  appointmentServiceId: string,
  assignedStaffId: string
): Promise<AssignStaffResponse> =>
  api.patch(apiAssignStaff(appointmentServiceId), {
    assignedStaffId: assignedStaffId.trim(),
  });

const AppointmentServiceService = {
  createOnlineBooking,
  createOnlineAppointmentService,
  listOrderServices,
  assignStaff,
};

export default AppointmentServiceService;
export { AppointmentServiceService as AppointmentService };
export * from './urls';
export * from './helpers';
export * from './types';
