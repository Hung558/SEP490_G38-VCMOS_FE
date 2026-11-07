import api from '../01_axios';
import { apiOnlineAppointmentService, apiCreateOnlineBooking } from './urls';
import {
  buildCreateOnlineAppointmentServicePayload,
  buildCreateOnlineBookingPayload,
} from './helpers';
import type {
  CreateOnlineAppointmentServicePayload,
  CreateOnlineAppointmentServiceResponse,
  CreateCombinedOnlineBookingPayload,
  CreateCombinedOnlineBookingResponse,
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

const AppointmentServiceService = {
  createOnlineBooking,
  createOnlineAppointmentService,
};

export default AppointmentServiceService;
export { AppointmentServiceService as AppointmentService };
export * from './urls';
export * from './helpers';
export * from './types';
