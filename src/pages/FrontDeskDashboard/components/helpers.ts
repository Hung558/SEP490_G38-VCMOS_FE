export type FrontDeskPeriod = 'day' | 'week' | 'month' | 'custom';
export interface FrontDeskFilterDraft {
  period: FrontDeskPeriod;
  from: string;
  to: string;
}
export const PERIOD_LABELS: Record<FrontDeskPeriod, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  custom: 'Khoảng ngày tùy chọn',
};
export const APPOINTMENT_STATUSES = [
  ['Booked', 'Đã đặt, chưa tiếp nhận'],
  ['CheckedIn', 'Đã tiếp nhận'],
  ['InProgress', 'Đang thực hiện'],
  ['WaitOwner', 'Chờ chủ đón'],
  ['Done', 'Hoàn tất'],
  ['Overdue', 'Quá hạn'],
  ['Cancelled', 'Đã hủy'],
] as const;
// Fixed order of the donut parts (24/11): each keeps its colour every period
export const PAYMENT_ORDER = ['Cash', 'VNPay', 'PayOS'] as const;

export const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Tiền mặt',
  VNPay: 'VNPay',
  PayOS: 'Chuyển khoản VietQR (PayOS)',
};

export const isFrontDeskRole = (
  role?: string
): role is 'Receptionist' | 'Admin' =>
  role === 'Receptionist' || role === 'Admin';

/** Key the entire authorized subtree, so an auth/session change cannot reuse report state. */
export const frontDeskIdentityKey = (user: {
  _id?: string;
  code?: string;
  email?: string;
  username?: string;
  role?: string;
  systemRole?: string;
  token?: string;
}) =>
  JSON.stringify([
    user._id,
    user.code,
    user.email,
    user.username,
    user.role,
    user.systemRole,
    user.token,
  ]);

export const isRealCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};
export const validateFrontDeskFilters = (
  draft: FrontDeskFilterDraft
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!Object.hasOwn(PERIOD_LABELS, draft.period))
    errors.period = 'Hãy chọn kỳ thống kê hợp lệ.';
  if (draft.period !== 'custom') return errors;
  if (!isRealCalendarDate(draft.from))
    errors.from = 'Hãy nhập ngày bắt đầu có thật, theo định dạng YYYY-MM-DD.';
  if (!isRealCalendarDate(draft.to))
    errors.to = 'Hãy nhập ngày kết thúc có thật, theo định dạng YYYY-MM-DD.';
  if (!Object.keys(errors).length) {
    if (draft.from > draft.to)
      errors.from = 'Ngày bắt đầu không được sau ngày kết thúc.';
    else {
      const days =
        (Date.parse(`${draft.to}T00:00:00Z`) -
          Date.parse(`${draft.from}T00:00:00Z`)) /
          86400000 +
        1;
      if (days > 366)
        errors.to =
          'Khoảng ngày tối đa 366 ngày, tính cả ngày đầu và ngày cuối.';
    }
  }
  return errors;
};
export const buildFrontDeskFilters = (draft: FrontDeskFilterDraft) => {
  const errors = validateFrontDeskFilters(draft);
  if (Object.keys(errors).length) return { errors, filters: undefined };
  return {
    errors,
    filters:
      draft.period === 'custom'
        ? { period: draft.period, from: draft.from, to: draft.to }
        : { period: draft.period },
  };
};
export const formatReportDate = (value: string): string =>
  isRealCalendarDate(value) ? value.split('-').reverse().join('/') : '—';
export const formatReportNumber = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
export const formatReportMoney = (value: number): string =>
  `${formatReportNumber(value)} đ`;
export const formatAverageWait = (value: number | null): string =>
  value === null ? 'Chưa có dữ liệu' : `${formatReportNumber(value)} phút`;
export const hasPeriodActivity = (stats: {
  totalAppointments: number;
  invoices: { issuedCount: number; paidCount: number };
}): boolean =>
  stats.totalAppointments > 0 ||
  stats.invoices.issuedCount > 0 ||
  stats.invoices.paidCount > 0;
export const readFrontDeskError = (failure: unknown): string => {
  const error = failure as {
    response?: {
      status?: number;
      data?: { message?: unknown; errors?: unknown };
    };
  };
  const data = error?.response?.data;
  const fields =
    data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors).filter(
          (value): value is string => typeof value === 'string'
        )
      : [];
  if (fields.length) return fields.join(' ');
  if (error?.response?.status === 403)
    return 'Bạn không có quyền xem báo cáo quầy lễ tân. Vui lòng kiểm tra lại tài khoản.';
  if (error?.response?.status === 401)
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return typeof data?.message === 'string'
    ? data.message
    : 'Không tải được thống kê quầy lễ tân. Vui lòng thử lại.';
};
