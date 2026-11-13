import api from '../01_axios';
import {
  apiOnlineAppointmentService,
  apiCreateOnlineBooking,
  apiOrderServices,
  apiAssignStaff,
  apiCancelAppointmentService,
  apiMyQueue,
  apiStartAppointmentService,
  apiCompleteAppointmentService,
  apiGroomingNote,
  apiMyGroomingNotes,
} from './urls';
import { buildGroomingNotePayload } from './grooming';
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
  CancelAppointmentServicePayload,
  CancelAppointmentServiceResponse,
  GroomingNoteDraft,
  GroomingNoteResponse,
  ListMyGroomingNotesResponse,
  UpdateGroomingServiceResponse,
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

/**
 * Hủy lẻ 1 dịch vụ trong lịch hẹn (PetOwner hoặc Receptionist)
 * PATCH /api/appointment-services/:id/cancel
 */
const cancelAppointmentService = (
  appointmentServiceId: string,
  payload: CancelAppointmentServicePayload
): Promise<CancelAppointmentServiceResponse> =>
  api.patch(apiCancelAppointmentService(appointmentServiceId), {
    reason: (payload?.reason || '').trim(),
  });

const startGrooming = (id: string): Promise<UpdateGroomingServiceResponse> =>
  api.patch(apiStartAppointmentService(id));

const completeGrooming = (id: string): Promise<UpdateGroomingServiceResponse> =>
  api.patch(apiCompleteAppointmentService(id));

const createGroomingNote = async (
  id: string,
  draft: GroomingNoteDraft
): Promise<GroomingNoteResponse> =>
  // Không đặt Content-Type thủ công: Axios interceptor bỏ header JSON cho FormData.
  api.post(apiGroomingNote(id), buildGroomingNotePayload(draft));

const getGroomingNote = (
  id: string,
  options?: { signal?: AbortSignal }
): Promise<GroomingNoteResponse> =>
  api.get(apiGroomingNote(id), { signal: options?.signal });

const listMyGroomingNotes = (options?: {
  signal?: AbortSignal;
}): Promise<ListMyGroomingNotesResponse> =>
  api.get(apiMyGroomingNotes, { signal: options?.signal });

const AppointmentServiceService = {
  createOnlineBooking,
  createOnlineAppointmentService,
  listOrderServices,
  assignStaff,
  listMyQueue,
  cancelAppointmentService,
  startGrooming,
  completeGrooming,
  createGroomingNote,
  getGroomingNote,
  listMyGroomingNotes,
};

export default AppointmentServiceService;
export { AppointmentServiceService as AppointmentService };
export * from './urls';
export * from './helpers';
export * from './grooming';
export * from './types';
