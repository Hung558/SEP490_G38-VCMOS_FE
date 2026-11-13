import type { AppointmentStatus, ListStaffAppointmentsParams } from '@/types';

export const RECEPTION_TODAY_GROUPS = [
  { key: 'total', label: 'Tổng lịch hôm nay', status: undefined },
  { key: 'booked', label: 'Chờ tiếp nhận', status: 'Booked' },
  { key: 'checkedIn', label: 'Đã tiếp nhận', status: 'CheckedIn' },
  { key: 'waitOwner', label: 'Chờ chủ đón', status: 'WaitOwner' },
] as const;

export type ReceptionTodayGroup = (typeof RECEPTION_TODAY_GROUPS)[number];
export type ReceptionTodayKey = ReceptionTodayGroup['key'];
export type ReceptionTodayCounts = Record<ReceptionTodayKey, number>;

export const getReceptionTodayCountQuery = (
  day: string,
  status: ReceptionTodayGroup['status']
): ListStaffAppointmentsParams => ({
  from: day,
  to: day,
  page: 1,
  limit: 1,
  ...(status ? { status } : {}),
});

export const readReceptionTodayCount = (response: {
  pagination?: { total?: unknown };
}) => {
  const total = response.pagination?.total;
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) {
    throw new Error('Máy chủ chưa trả về tổng số lịch hẹn hợp lệ.');
  }
  return total;
};

export const getSelectedReceptionTodayGroup = (
  day: string,
  filters: Pick<
    ListStaffAppointmentsParams,
    'from' | 'to' | 'status' | 'code' | 'isOnline'
  >
): ReceptionTodayKey | undefined => {
  if (
    filters.from !== day ||
    filters.to !== day ||
    filters.code?.trim() ||
    filters.isOnline !== undefined
  )
    return;
  return RECEPTION_TODAY_GROUPS.find(group => group.status === filters.status)
    ?.key;
};

export const getReceptionNextAction = (status: AppointmentStatus) => {
  switch (status) {
    case 'Booked':
      return { kind: 'checkIn' as const };
    case 'CheckedIn':
      return { kind: 'detail' as const, hint: 'Kiểm tra dịch vụ và phân công' };
    case 'InProgress':
      return { kind: 'detail' as const, hint: 'Theo dõi tiến độ dịch vụ' };
    case 'WaitOwner':
      return { kind: 'detail' as const, hint: 'Kiểm tra trước khi bàn giao' };
  }
};
