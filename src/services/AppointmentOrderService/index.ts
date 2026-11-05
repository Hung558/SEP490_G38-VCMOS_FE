import api from '../01_axios';
import {
  apiOnlineBooking,
  apiMyBookings,
  apiMyBookingDetail,
  apiStaffAppointments,
  apiCheckInAppointment,
} from './urls';
import {
  buildBookingPayload,
  buildBookingFilterQuery,
  buildStaffAppointmentFilterQuery,
} from './helpers';
import type {
  CheckInAppointmentResponse,
  CreateOnlineBookingPayload,
  CreateOnlineBookingResponse,
  ListMyOnlineBookingsParams,
  ListMyOnlineBookingsResponse,
  ListStaffAppointmentsParams,
  ListStaffAppointmentsResponse,
  OnlineBookingDetailResponse,
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
 * Không gửi request body
 */
const checkInAppointment = (
  id: string
): Promise<CheckInAppointmentResponse> => {
  return api.patch(apiCheckInAppointment(id));
};

const AppointmentOrderService = {
  createOnlineBooking,
  listMyOnlineBookings,
  getMyOnlineBookingById,
  listStaffAppointments,
  checkInAppointment,
};

export * from './urls';
export * from './helpers';
export default AppointmentOrderService;
