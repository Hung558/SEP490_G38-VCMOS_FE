// Date ranges of the Admin sales report (nghiệp vụ 7.3: "theo ngày/tuần/tháng").
// The BE counts paid invoices by paidAt in Vietnam time, both ends included.

import { BEST_SELLING_MAX_DAYS } from '../../../services/InvoiceService/helpers.ts';

export type ReportPeriod = 'day' | 'week' | 'month';

export interface ReportRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
};

const pad = (value: number) => String(value).padStart(2, '0');

/** Local calendar day, e.g. 2026-11-18 */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Today, this week from Monday, or this month from the 1st, each up to today:
 * the days that can already have sales.
 */
export const getPeriodRange = (
  period: ReportPeriod,
  now: Date = new Date()
): ReportRange => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  if (period === 'week') {
    const sinceMonday = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - sinceMonday);
  } else if (period === 'month') {
    start.setDate(1);
  }
  return { from: toDateKey(start), to: toDateKey(today) };
};

/** The period a range is, or undefined for a range picked by hand */
export const matchReportPeriod = (
  range: ReportRange,
  now: Date = new Date()
): ReportPeriod | undefined =>
  (Object.keys(REPORT_PERIOD_LABELS) as ReportPeriod[]).find(period => {
    const candidate = getPeriodRange(period, now);
    return candidate.from === range.from && candidate.to === range.to;
  });

/** Days in [from, to], both ends included; 0 when the range is upside down */
export const countRangeDays = ({ from, to }: ReportRange) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
};

/** What the BE accepts: from not after to, at most 366 days */
export const isReportRangeValid = (range: ReportRange) => {
  const days = countRangeDays(range);
  return days >= 1 && days <= BEST_SELLING_MAX_DAYS;
};

/** 2026-11-18 → 18/11/2026 */
export const formatDateKey = (key: string) => {
  const [y, m, d] = key.split('-');
  return y && m && d ? `${d}/${m}/${y}` : key;
};

/** "18/11/2026" or "16/11/2026 – 18/11/2026" */
export const formatReportRange = ({ from, to }: ReportRange) =>
  from === to
    ? formatDateKey(from)
    : `${formatDateKey(from)} – ${formatDateKey(to)}`;

/** Bar length of a row against the top row, 0..100 */
export const getShareOfTop = (value: number, top: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(top) || top <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / top) * 100)));
};
