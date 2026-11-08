import api from '../01_axios';
import { apiStaffList } from './urls';
import { buildStaffQuery } from './helpers';
import type { ListStaffParams, ListStaffResponse } from '@/types';

/**
 * Danh sách Bác sĩ thú y / Groomer (mọi vai trò đã đăng nhập), mặc định chỉ lấy Active
 * GET /api/users/staff
 */
const listStaff = (
  params?: ListStaffParams,
  options?: { signal?: AbortSignal }
): Promise<ListStaffResponse> =>
  api.get(apiStaffList, {
    params: buildStaffQuery(params),
    signal: options?.signal,
  });

const StaffService = {
  listStaff,
};

export * from './urls';
export * from './helpers';
export default StaffService;
