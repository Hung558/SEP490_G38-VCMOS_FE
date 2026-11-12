import api from '../01_axios';
import {
  apiOnlineBooking,
  apiMyBookings,
  apiMyBookingDetail,
  apiStaffAppointments,
  apiCheckInAppointment,
  apiCancelAppointment,
} from './urls';
import {
  buildBookingPayload,
  buildBookingFilterQuery,
  buildStaffAppointmentFilterQuery,
} from './helpers';
import { buildCheckInPayload } from './intake';
import type {
  CancelAppointmentPayload,
  CancelAppointmentResponse,
  CheckInAppointmentResponse,
  CreateOnlineBookingPayload,
  CreateOnlineBookingResponse,
  ListMyOnlineBookingsParams,
  ListMyOnlineBookingsResponse,
  ListStaffAppointmentsParams,
  ListStaffAppointmentsResponse,
  OnlineBookingDetailResponse,
  ReceptionIntake,
} from '@/types';

/**
 * Tạo lịch hẹn online cho thú cưng của chủ nuôi đang đăng nhập
 * POST /api/appointment-orders/online
 */
const createOnlineBooking = (
  data: CreateOnlineBookingPayload
): Promise<CreateOnlineBookingResponse> => {
  const payload = buildBookingPayload(data);
  return api.post(apiOnlineBooking, payload);
};

/**
 * Lấy danh sách lịch hẹn online của chủ nuôi đang đăng nhập
 * GET /api/appointment-orders/me
 */
const listMyOnlineBookings = (
  params?: ListMyOnlineBookingsParams,
  options?: { signal?: AbortSignal }
): Promise<ListMyOnlineBookingsResponse> => {
  const query = buildBookingFilterQuery(params);
  return api.get(apiMyBookings, {
    params: query,
    signal: options?.signal,
  });
};

/**
 * Lấy thông tin chi tiết một lịch hẹn online của chủ nuôi
 * GET /api/appointment-orders/me/:id
 */
const getMyOnlineBookingById = (
  id: string,
  options?: { signal?: AbortSignal }
): Promise<OnlineBookingDetailResponse> => {
  return api.get(apiMyBookingDetail(id), {
    signal: options?.signal,
  });
};

/**
 * Lấy danh sách toàn bộ lịch hẹn (dành cho Admin / Receptionist)
 * GET /api/appointment-orders
 */
const listStaffAppointments = (
  params?: ListStaffAppointmentsParams,
  options?: { signal?: AbortSignal }
): Promise<ListStaffAppointmentsResponse> => {
  const query = buildStaffAppointmentFilterQuery(params);
  return api.get(apiStaffAppointments, {
    params: query,
    signal: options?.signal,
  });
};

/**
 * Tiếp nhận / check-in lịch hẹn (dành riêng cho Receptionist, Booked -> CheckedIn)
 * PATCH /api/appointment-orders/:id/check-in
 * Luồng cũ không gửi body; khi có phiếu tiếp nhận, gửi { intake }.
 */
const checkInAppointment = async (
  id: string,
  intake?: ReceptionIntake
): Promise<CheckInAppointmentResponse> => {
  const url = apiCheckInAppointment(id);
  const payload = buildCheckInPayload(intake);
  return payload ? api.patch(url, payload) : api.patch(url);
};

/**
 * Hủy toàn bộ đơn lịch hẹn (dành cho PetOwner trước check-in hoặc Receptionist)
 * PATCH /api/appointment-orders/:id/cancel
 */
const cancelAppointment = (
  id: string,
  payload: CancelAppointmentPayload
): Promise<CancelAppointmentResponse> => {
  return api.patch(apiCancelAppointment(id), {
    reason: (payload?.reason || '').trim(),
  });
};

const AppointmentOrderService = {
  createOnlineBooking,
  listMyOnlineBookings,
  getMyOnlineBookingById,
  listStaffAppointments,
  checkInAppointment,
  cancelAppointment,
};

export * from './urls';
export * from './helpers';
export * from './intake';
export default AppointmentOrderService;
