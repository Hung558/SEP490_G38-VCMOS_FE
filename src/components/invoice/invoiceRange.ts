import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getVietnamTodayString } from '../../services/AppointmentOrderService/helpers.ts';

export type InvoicePeriod = 'day' | 'week' | 'month' | 'custom';

export const INVOICE_PERIOD_OPTIONS: { value: InvoicePeriod; label: string }[] =
  [
    { value: 'day', label: 'Ngày' },
    { value: 'week', label: 'Tuần' },
    { value: 'month', label: 'Tháng' },
    { value: 'custom', label: 'Tùy chọn' },
  ];

export type InvoiceRange = [Dayjs | null, Dayjs | null] | null;

/** Current calendar periods in Vietnam; a week runs Monday through Sunday. */
export const getInvoicePeriodRange = (
  period: Exclude<InvoicePeriod, 'custom'>,
  date = getVietnamTodayString()
): [Dayjs, Dayjs] => {
  const today = dayjs(date);
  if (period === 'week') {
    const monday = today.subtract((today.day() + 6) % 7, 'day');
    return [monday, monday.add(6, 'day')];
  }
  if (period === 'month') return [today.startOf('month'), today.endOf('month')];
  return [today, today];
};

/** Invoice pages open on today's bills. */
export const getTodayRange = (): InvoiceRange => getInvoicePeriodRange('day');

/** Quick choices of the issue-date filter */
export const getInvoiceRangePresets = () => {
  const today = dayjs(getVietnamTodayString());
  return [
    { label: 'Hôm nay', value: getInvoicePeriodRange('day') },
    { label: 'Tuần này', value: getInvoicePeriodRange('week') },
    { label: 'Tháng này', value: getInvoicePeriodRange('month') },
    {
      label: '7 ngày qua',
      value: [today.subtract(6, 'day'), today] as [Dayjs, Dayjs],
    },
    {
      label: '30 ngày qua',
      value: [today.subtract(29, 'day'), today] as [Dayjs, Dayjs],
    },
  ];
};

export const isTodayRange = (range: InvoiceRange) => {
  const today = getVietnamTodayString();
  return (
    Boolean(range?.[0] && range?.[1]) &&
    range?.[0]?.format('YYYY-MM-DD') === today &&
    range?.[1]?.format('YYYY-MM-DD') === today
  );
};
