import type { AppointmentStatus, ListStaffAppointmentsParams } from '@/types';

export const RECEPTION_TODAY_GROUPS = [
  { key: 'total', label: 'Tổng lịch hôm nay', status: undefined },
  { key: 'booked', label: 'Chờ tiếp nhận', status: 'Booked' },
  { key: 'checkedIn', label: 'Đã tiếp nhận', status: 'CheckedIn' },
  // SRS SCR-16 counters: Booked, Checked in, In Progress, Wait Owner
  { key: 'inProgress', label: 'Đang thực hiện', status: 'InProgress' },
  { key: 'waitOwner', label: 'Chờ chủ đón', status: 'WaitOwner' },
] as const;

export type ReceptionTodayGroup = (typeof RECEPTION_TODAY_GROUPS)[number];
export type ReceptionTodayKey = ReceptionTodayGroup['key'];
export type ReceptionTodayCounts = Record<ReceptionTodayKey, number>;

/**
 * The pet is at the clinic in these states. Nghiệp vụ 4.3 lets the owner come
 * early or late, so the appointment date may not be today: a pet booked for
 * tomorrow and checked in today still has to be served and billed today (4.6).
 * These counters and their lists therefore cover every appointment date.
 */
const AT_CLINIC_STATUSES: ReadonlySet<string> = new Set([
  'CheckedIn',
  'InProgress',
  'WaitOwner',
]);

export const isAtClinicStatus = (status?: string) =>
  Boolean(status && AT_CLINIC_STATUSES.has(status));

export const getReceptionTodayCountQuery = (
  day: string,
  status: ReceptionTodayGroup['status']
): ListStaffAppointmentsParams => ({
  ...(isAtClinicStatus(status) ? {} : { from: day, to: day }),
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
  if (filters.code?.trim() || filters.isOnline !== undefined) return;
  const datesMatch = isAtClinicStatus(filters.status)
    ? !filters.from && !filters.to
    : filters.from === day && filters.to === day;
  if (!datesMatch) return;
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
    // Nghiệp vụ 4.6: khách đến đón thì lễ tân lập hóa đơn và thu tiền
    case 'WaitOwner':
      return {
        kind: 'checkout' as const,
        hint: 'Lập hóa đơn và thu tiền khi chủ đến đón',
      };
  }
};
