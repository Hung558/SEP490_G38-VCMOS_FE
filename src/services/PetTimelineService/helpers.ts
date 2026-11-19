import type {
  PetTimelineInvoiceRole,
  PetTimelinePage,
  PetTimelineQuery,
} from './types.ts';
export const PET_TIMELINE_PAGE_SIZE = 20;
export const buildPetTimelineQuery = (
  query: PetTimelineQuery
): Required<Pick<PetTimelineQuery, 'page' | 'limit'>> & PetTimelineQuery => ({
  ...query,
  page: query.page ?? 1,
  limit: query.limit ?? PET_TIMELINE_PAGE_SIZE,
});
const INVOICE_VIEWER_ROLES = new Set<PetTimelineInvoiceRole>([
  'PetOwner',
  'Receptionist',
  'Admin',
]);
export const canViewTimelineInvoices = (role?: string | null): boolean =>
  Boolean(role && INVOICE_VIEWER_ROLES.has(role as PetTimelineInvoiceRole));

/** Fail closed: remove every financial payload when role is not on BE's allowlist. */
export const sanitizeTimelineInvoices = <T extends PetTimelinePage>(
  timeline: T,
  role?: string | null
): T => {
  if (canViewTimelineInvoices(role)) return timeline;
  return {
    ...timeline,
    activeInpatient: timeline.activeInpatient
      ? { ...timeline.activeInpatient, invoice: null }
      : null,
    timeline: timeline.timeline.map(milestone => ({
      ...milestone,
      invoice: null,
      inpatientRecord: milestone.inpatientRecord
        ? { ...milestone.inpatientRecord, invoice: null }
        : null,
    })),
  };
};
export const getPetTimelineRefName = (
  ref:
    | { fullName?: string; name?: string; label?: string }
    | string
    | null
    | undefined
): string | undefined =>
  typeof ref === 'object' && ref
    ? ref.fullName || ref.name || ref.label || undefined
    : undefined;
export const formatTimelineDate = (date?: string | null): string => {
  if (!date) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

/** Allow only ordinary web URLs from API media fields; reject script/data URLs and credentials. */
export const getSafeTimelineHttpUrl = (
  value?: string | null
): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

export const PET_TIMELINE_STATUS_LABELS: Record<string, string> = {
  Booked: 'Đã đặt lịch',
  CheckedIn: 'Đã tiếp đón',
  InProgress: 'Đang thực hiện',
  WaitOwner: 'Chờ chủ đón',
  Done: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  Overdue: 'Quá giờ hẹn',
  Admitted: 'Đang điều trị',
  Discharged: 'Đã xuất viện',
  Completed: 'Hoàn tất',
  PendingReview: 'Chờ duyệt',
  Published: 'Đã đăng',
  Hidden: 'Đã ẩn',
  Removed: 'Đã gỡ',
  Draft: 'Bản nháp',
  Finalized: 'Đã chốt',
  Waiting: 'Đang chờ',
  Pending: 'Đang chờ',
  Unpaid: 'Chưa thanh toán',
  Paid: 'Đã thanh toán',
  Refunded: 'Đã hoàn tiền',
};

export const PET_TIMELINE_TYPE_LABELS = {
  All: 'Tất cả loại mốc',
  Examination: 'Khám bệnh',
  Vaccination: 'Tiêm phòng',
  Grooming: 'Chăm sóc / làm đẹp',
  Paraclinical: 'Cận lâm sàng',
  Inpatient: 'Điều trị nội trú',
} as const;

export const getPetTimelineStatusLabel = (status: string): string =>
  PET_TIMELINE_STATUS_LABELS[status] || 'Khác';
