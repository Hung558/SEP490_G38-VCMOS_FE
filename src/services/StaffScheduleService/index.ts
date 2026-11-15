import api from '../01_axios';
import type {
  CreateBusySchedulePayload,
  CreateBusyScheduleResponse,
  ListBusySchedulesParams,
  ListBusySchedulesResponse,
} from '@/types';
import { buildBusySchedulePayload } from './helpers';
import {
  apiMyStaffSchedules,
  apiStaffScheduleDetail,
  apiStaffSchedules,
} from './urls';

const cleanParams = (params?: ListBusySchedulesParams) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => Boolean(value))
  );

/**
 * Lịch báo bận (BE f19060f). Admin, Lễ tân xem của mọi người; Bác sĩ, Groomer
 * chỉ nhận về của chính mình.
 * GET /api/staff-schedules
 */
const list = (
  params?: ListBusySchedulesParams,
  options?: { signal?: AbortSignal }
): Promise<ListBusySchedulesResponse> =>
  api.get(apiStaffSchedules, {
    params: cleanParams(params),
    signal: options?.signal,
  });

/** GET /api/staff-schedules/me: lịch báo bận của người đang đăng nhập */
const listMine = (
  params?: Omit<ListBusySchedulesParams, 'staffId'>,
  options?: { signal?: AbortSignal }
): Promise<ListBusySchedulesResponse> =>
  api.get(apiMyStaffSchedules, {
    params: cleanParams(params),
    signal: options?.signal,
  });

/** POST /api/staff-schedules: Admin ghi một ca bận cho bác sĩ hoặc groomer */
const create = (
  payload: CreateBusySchedulePayload
): Promise<CreateBusyScheduleResponse> =>
  api.post(apiStaffSchedules, buildBusySchedulePayload(payload));

/** DELETE /api/staff-schedules/:id: bỏ ca bận, người đó làm lại ca này */
const remove = (id: string): Promise<{ message: string }> =>
  api.delete(apiStaffScheduleDetail(id));

const StaffScheduleService = { list, listMine, create, remove };

export * from './urls';
export * from './helpers';
export default StaffScheduleService;
