import api from '../01_axios';
import {
  apiOnlineAppointmentService,
  apiCreateOnlineBooking,
  apiOrderServices,
  apiAssignStaff,
  apiMyQueue,
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
  AppointmentServiceStatus,
  ListMyQueueResponse,
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

/**
 * Bác sĩ / Groomer xem các dịch vụ được giao cho chính mình (id lấy từ token).
 * Ca cấp cứu xếp trước, rồi theo số thứ tự; không lọc theo ngày
 * GET /api/appointment-services/my-queue?status=
 */
const listMyQueue = (
  status?: AppointmentServiceStatus,
  options?: { signal?: AbortSignal }
): Promise<ListMyQueueResponse> =>
  api.get(apiMyQueue, {
    params: status ? { status } : undefined,
    signal: options?.signal,
  });

const AppointmentServiceService = {
  createOnlineBooking,
  createOnlineAppointmentService,
  listOrderServices,
  assignStaff,
  listMyQueue,
};

export default AppointmentServiceService;
export { AppointmentServiceService as AppointmentService };
export * from './urls';
export * from './helpers';
export * from './types';
