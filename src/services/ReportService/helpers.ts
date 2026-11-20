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

export const buildReportQuery = (filters: ReportFilters) => ({
  period: filters.period,
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
  ...(filters.groupBy ? { groupBy: filters.groupBy } : {}),
});

export const fillRevenueSeries = (report: RevenueReportLike) => {
  const start = Date.parse(`${report.from}T00:00:00Z`);
  const end = Date.parse(`${report.to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end)
    return report.revenueSeries;
  const existing = new Map(
    report.revenueSeries.map(item => [item.period, item])
  );
  const buckets: string[] = [];
  if (report.groupBy === 'month') {
    const cursor = new Date(
      Date.UTC(
        new Date(start).getUTCFullYear(),
        new Date(start).getUTCMonth(),
        1
      )
    );
    while (cursor.getTime() <= end) {
      buckets.push(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else {
    for (let day = start; day <= end; day += DAY_MS)
      buckets.push(new Date(day).toISOString().slice(0, 10));
  }
  return buckets.map(
    period => existing.get(period) ?? { period, revenue: 0, invoiceCount: 0 }
  );
};

type RevenueReportLike = {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  revenueSeries: { period: string; revenue: number; invoiceCount: number }[];
};
