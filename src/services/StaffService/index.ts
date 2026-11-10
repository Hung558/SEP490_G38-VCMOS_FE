import api from '../01_axios';
import { apiStaffList } from './urls';
import { buildStaffQuery } from './helpers';
import type { ListStaffParams, ListStaffResponse, StaffMember } from '@/types';

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

/**
 * Hai danh sách để chọn người phụ trách cho ngày `workDate`: người có lịch làm việc ngày
 * đó, và mọi người đang hoạt động (dùng khi một vai trò chưa ai có lịch)
 */
const listStaffForDate = async (
  workDate: string,
  options?: { signal?: AbortSignal }
): Promise<{ onDuty: StaffMember[]; all: StaffMember[] }> => {
  const [onDuty, all] = await Promise.all([
    listStaff({ status: 'Active', workDate, limit: 100 }, options),
    listStaff({ status: 'Active', limit: 100 }, options),
  ]);
  return { onDuty: onDuty.items || [], all: all.items || [] };
};

const StaffService = {
  listStaff,
  listStaffForDate,
};

export * from './urls';
export * from './helpers';
export default StaffService;
