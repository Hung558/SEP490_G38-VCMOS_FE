import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getVietnamTodayString } from '@/services/AppointmentOrderService';

export type InvoiceRange = [Dayjs | null, Dayjs | null] | null;

/** Invoice pages open on today's bills (yêu cầu 17/11: "ưu tiên hiện ngày hôm nay") */
export const getTodayRange = (): InvoiceRange => {
  const today = dayjs(getVietnamTodayString());
  return [today, today];
};

/** Quick choices of the issue-date filter */
export const getInvoiceRangePresets = () => {
  const today = dayjs(getVietnamTodayString());
  return [
    { label: 'Hôm nay', value: [today, today] as [Dayjs, Dayjs] },
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
