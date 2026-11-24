// Labels and number formats of the Admin overview
import dayjs from 'dayjs';

export const money = (n?: number | null) =>
  `${(n ?? 0).toLocaleString('vi-VN')} ₫`;

export const pct = (n?: number | null) =>
  `${(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

export const count = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN');

export const dateLabel = (from: string, to: string) =>
  from === to
    ? dayjs(from).format('DD/MM/YYYY')
    : `${dayjs(from).format('DD/MM/YYYY')} – ${dayjs(to).format('DD/MM/YYYY')}`;

// Lifecycle order, so the bars read like the flow of an appointment
export const STATUS_ORDER = [
  'Booked',
  'CheckedIn',
  'InProgress',
  'WaitOwner',
  'Done',
  'Overdue',
  'Cancelled',
] as const;

export const statusLabels: Record<string, string> = {
  Booked: 'Đã đặt',
  CheckedIn: 'Đã đến',
  InProgress: 'Đang khám',
  WaitOwner: 'Chờ chủ đón',
  Done: 'Hoàn tất',
  Overdue: 'Quá hạn',
  Cancelled: 'Đã hủy',
};

export const categoryLabels: Record<string, string> = {
  Examination: 'Khám',
  Vaccination: 'Tiêm chủng',
  Grooming: 'Spa',
  Paraclinical: 'Cận lâm sàng',
  Inpatient: 'Nội trú',
};

export const itemTypeLabels: Record<string, string> = {
  Service: 'Dịch vụ',
  Product: 'Sản phẩm',
  InpatientDay: 'Ngày nội trú',
};

// Fixed order of donut parts (24/11): each keeps its colour every period
export const PAYMENT_ORDER = ['Cash', 'VNPay', 'PayOS'] as const;
export const ITEM_TYPE_ORDER = ['Service', 'Product', 'InpatientDay'] as const;

export const paymentLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  VNPay: 'VNPay',
  PayOS: 'Chuyển khoản VietQR (PayOS)',
};

/** Revenue bucket from the BE: 2026-11-05 (by day) or 2026-11 (by month) */
export const formatSeriesPeriod = (period: string) => {
  const [y, m, d] = period.split('-');
  if (y && m && d) return { label: `${d}/${m}/${y}`, tick: `${d}/${m}` };
  if (y && m) return { label: `Tháng ${m}/${y}`, tick: `${m}/${y}` };
  return { label: period, tick: period };
};
