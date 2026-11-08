import api from '../01_axios';
import { apiWalkInBooking, apiWalkInCustomerLookup } from './urls';
import { normalizeWalkInPhone } from './helpers';
import type {
  CreateWalkInBookingPayload,
  CreateWalkInBookingResponse,
  WalkInLookupResponse,
} from '@/types';

/**
 * Lễ tân / Admin tra cứu khách hàng theo SĐT, kèm các thú cưng đang hoạt động (UC-20)
 * GET /api/appointment-orders/walk-in/customer-lookup?phone=
 * SĐT chưa có trong hệ thống vẫn trả 200 với `found: false`
 */
const lookupCustomer = (
  phone: string,
  options?: { signal?: AbortSignal }
): Promise<WalkInLookupResponse> =>
  api.get(apiWalkInCustomerLookup, {
    params: { phone: normalizeWalkInPhone(phone) },
    signal: options?.signal,
  });

/**
 * Lễ tân tiếp nhận khách vãng lai tại quầy (UC-19, UC-21, BR-04, BR-06).
 * Lịch tạo ra ở trạng thái CheckedIn; dịch vụ có người phụ trách vào thẳng hàng đợi
 * POST /api/appointment-orders/walk-in
 */
const createWalkInBooking = (
  payload: CreateWalkInBookingPayload
): Promise<CreateWalkInBookingResponse> => api.post(apiWalkInBooking, payload);

const WalkInService = {
  lookupCustomer,
  createWalkInBooking,
};

export * from './urls';
export * from './helpers';
export default WalkInService;
