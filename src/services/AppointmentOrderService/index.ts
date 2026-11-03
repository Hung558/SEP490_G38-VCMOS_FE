import api from '../01_axios';
import { apiOnlineBooking, apiMyBookings, apiMyBookingDetail } from './urls';
import { buildBookingPayload, buildBookingFilterQuery } from './helpers';
import type {
  CreateOnlineBookingPayload,
  CreateOnlineBookingResponse,
  ListMyOnlineBookingsParams,
  ListMyOnlineBookingsResponse,
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

const AppointmentOrderService = {
  createOnlineBooking,
  listMyOnlineBookings,
  getMyOnlineBookingById,
};

export * from './urls';
export * from './helpers';
export default AppointmentOrderService;
