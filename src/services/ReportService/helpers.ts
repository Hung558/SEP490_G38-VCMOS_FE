import type { ReportFilters } from './types';

const DAY_MS = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const isCalendarDate = (value: string) => {
  if (!DATE_KEY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const validateReportFilters = (
  filters: ReportFilters
): string | undefined => {
  if (filters.period !== 'custom') return undefined;
  if (
    !filters.from ||
    !filters.to ||
    !isCalendarDate(filters.from) ||
    !isCalendarDate(filters.to)
  )
    return 'Vui lòng chọn khoảng ngày hợp lệ.';
  const days =
    (Date.parse(`${filters.to}T00:00:00Z`) -
      Date.parse(`${filters.from}T00:00:00Z`)) /
      DAY_MS +
    1;
  if (days < 1) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
  if (days > 366) return 'Khoảng ngày không được vượt quá 366 ngày.';
  return undefined;
};

// Presets must never retain a previous custom range: BE explicit dates override presets.
export const buildReportQuery = (
  filters: ReportFilters,
  allowGroupBy = true
) => ({
  period: filters.period,
  ...(filters.period === 'custom' && filters.from
    ? { from: filters.from }
    : {}),
  ...(filters.period === 'custom' && filters.to ? { to: filters.to } : {}),
  ...(allowGroupBy && filters.groupBy ? { groupBy: filters.groupBy } : {}),
});
