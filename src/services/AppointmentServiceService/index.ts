import api from '../01_axios';
import { apiOnlineAppointmentService } from './urls';
import { buildCreateOnlineAppointmentServicePayload } from './helpers';
import type {
  CreateOnlineAppointmentServicePayload,
  CreateOnlineAppointmentServiceResponse,
} from './types';

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
  createOnlineAppointmentService,
};

export default AppointmentServiceService;
export { AppointmentServiceService as AppointmentService };
export * from './urls';
export * from './helpers';
export * from './types';
