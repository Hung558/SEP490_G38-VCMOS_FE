import type {
  AppointmentStatus,
  CreateOnlineBookingPayload,
  ListMyOnlineBookingsParams,
  ListStaffAppointmentsParams,
  PopulatedOwnerRef,
  PopulatedPetRef,
} from '@/types';

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'Booked',
  'CheckedIn',
  'InProgress',
  'WaitOwner',
  'Done',
  'Cancelled',
  'Overdue',
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  Booked: 'Đã đặt',
  CheckedIn: 'Đã tiếp nhận',
  InProgress: 'Đang thực hiện',
  WaitOwner: 'Chờ chủ đón',
  Done: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  Overdue: 'Quá hạn',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  Booked: 'blue',
  CheckedIn: 'cyan',
  InProgress: 'orange',
  WaitOwner: 'purple',
  Done: 'green',
  Cancelled: 'red',
  Overdue: 'default',
};

export const getAppointmentStatusLabel = (status?: string): string => {
  if (!status) return 'Không xác định';
  return APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] || status;
};

export const getAppointmentStatusColor = (status?: string): string => {
  if (!status) return 'default';
  return APPOINTMENT_STATUS_COLORS[status as AppointmentStatus] || 'default';
};

/** Lấy ngày hiện tại theo giờ Việt Nam (Asia/Ho_Chi_Minh) dạng YYYY-MM-DD */
export const getVietnamTodayString = (now = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    const d = now;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
};

const OWNER_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export const OWNER_CANCEL_DEADLINE_MESSAGE =
  'Đã quá hạn tự hủy trực tuyến. Vui lòng liên hệ phòng khám để được hỗ trợ.';

type CancellableOrder = {
  derivedStatus: AppointmentStatus;
  date: string;
  slotStart?: string | null;
};
type CancellableService = { status: string; scheduledStart?: string | null };

export const canOwnerCancelAppointment = (
  order: CancellableOrder,
  service?: CancellableService,
  now = new Date()
): boolean => {
  if (
    order.derivedStatus !== 'Booked' ||
    (service && service.status !== 'Booked')
  )
    return false;
  // The API uses a clinic-local calendar date. Keep the same date if a legacy response includes an ISO suffix.
  const date = order.date.slice(0, 10);
  const start = service?.scheduledStart || order.slotStart;
  return start
    ? new Date(`${date}T${start}:00+07:00`).getTime() - now.getTime() >=
        OWNER_CANCELLATION_WINDOW_MS
    : date >= getVietnamTodayString(now);
};

export const canReceptionCancelAppointment = (
  orderStatus: AppointmentStatus,
  services?: readonly CancellableService[]
): boolean =>
  orderStatus === 'Booked' ||
  (orderStatus === 'CheckedIn' &&
    services !== undefined &&
    !services.some(
      service => service.status === 'InProgress' || service.status === 'Done'
    ));

export const canReceptionCancelService = (
  orderStatus: AppointmentStatus,
  service: CancellableService
): boolean =>
  !['Done', 'Cancelled', 'Overdue'].includes(orderStatus) &&
  ['Booked', 'Waiting'].includes(service.status);

/** Validate ngày đặt lịch: đúng định dạng YYYY-MM-DD, là ngày thật và không ở quá khứ */
export const validateBookingDate = (date?: string): string | undefined => {
  if (!date || typeof date !== 'string' || !date.trim()) {
    return 'Ngày hẹn là bắt buộc';
  }
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'Ngày phải đúng định dạng YYYY-MM-DD và hợp lệ';
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return 'Ngày phải đúng định dạng YYYY-MM-DD và hợp lệ';
  }

  const todayStr = getVietnamTodayString();
  if (trimmed < todayStr) {
    return 'Ngày hẹn không được ở trong quá khứ';
  }

  return undefined;
};

/** Validate ghi chú đặt lịch: chuỗi, tối đa 500 ký tự */
export const validateBookingNote = (note?: unknown): string | undefined => {
  if (note === undefined || note === null || note === '') {
    return undefined;
  }
  if (typeof note !== 'string') {
    return 'Ghi chú phải là chuỗi';
  }
  if (note.trim().length > 500) {
    return 'Ghi chú tối đa 500 ký tự';
  }
  return undefined;
};

/** Validate petId: bắt buộc là chuỗi hex MongoId 24 ký tự */
export const validateBookingPetId = (petId?: string): string | undefined => {
  if (!petId || typeof petId !== 'string' || !petId.trim()) {
    return 'Vui lòng chọn thú cưng';
  }
  const trimmed = petId.trim();
  if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return 'petId không hợp lệ';
  }
  return undefined;
};

/** Build payload gửi lên POST /api/appointment-orders/online */
export const buildBookingPayload = (
  raw: CreateOnlineBookingPayload
): CreateOnlineBookingPayload => {
  const payload: CreateOnlineBookingPayload = {
    petId: (raw.petId || '').trim(),
    date: (raw.date || '').trim(),
  };

  if (typeof raw.slotStart === 'string' && raw.slotStart.trim()) {
    payload.slotStart = raw.slotStart.trim();
  }

  const trimmedNote = (raw.note || '').trim();
  if (trimmedNote) {
    payload.note = trimmedNote;
  }

  return payload;
};

/** Build query params cho GET /api/appointment-orders/me */
export const buildBookingFilterQuery = (
  params?: ListMyOnlineBookingsParams
): Record<string, string | number> => {
  if (!params) return {};
  const query: Record<string, string | number> = {};

  if (params.status && APPOINTMENT_STATUSES.includes(params.status)) {
    query.status = params.status;
  }
  if (params.from && typeof params.from === 'string' && params.from.trim()) {
    query.from = params.from.trim();
  }
  if (params.to && typeof params.to === 'string' && params.to.trim()) {
    query.to = params.to.trim();
  }
  if (typeof params.page === 'number' && params.page >= 1) {
    query.page = Math.floor(params.page);
  }
  if (
    typeof params.limit === 'number' &&
    params.limit >= 1 &&
    params.limit <= 100
  ) {
    query.limit = Math.floor(params.limit);
  }

  return query;
};

/** Build query params cho GET /api/appointment-orders (dành cho Admin / Receptionist) */
export const buildStaffAppointmentFilterQuery = (
  params?: ListStaffAppointmentsParams
): Record<string, string | number | boolean> => {
  if (!params) return {};
  const query: Record<string, string | number | boolean> = {};

  if (params.status && APPOINTMENT_STATUSES.includes(params.status)) {
    query.status = params.status;
  }
  if (typeof params.isOnline === 'boolean') {
    query.isOnline = params.isOnline;
  }
  if (
    params.ownerId &&
    typeof params.ownerId === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(params.ownerId.trim())
  ) {
    query.ownerId = params.ownerId.trim();
  }
  if (
    params.petId &&
    typeof params.petId === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(params.petId.trim())
  ) {
    query.petId = params.petId.trim();
  }
  if (params.code && typeof params.code === 'string') {
    const trimmedCode = params.code.trim().toUpperCase();
    if (/^APT-[A-Z0-9]{6}$/.test(trimmedCode)) {
      query.code = trimmedCode;
    }
  }
  if (params.from && typeof params.from === 'string' && params.from.trim()) {
    query.from = params.from.trim();
  }
  if (params.to && typeof params.to === 'string' && params.to.trim()) {
    query.to = params.to.trim();
  }
  if (typeof params.page === 'number' && params.page >= 1) {
    query.page = Math.floor(params.page);
  }
  if (
    typeof params.limit === 'number' &&
    params.limit >= 1 &&
    params.limit <= 100
  ) {
    query.limit = Math.floor(params.limit);
  }

  return query;
};

/** Lấy tên thú cưng an toàn từ petId (dạng object hoặc string) */
export const getAppointmentPetName = (
  pet?: PopulatedPetRef | string | null
): string => {
  if (!pet) return 'Chưa rõ';
  if (typeof pet === 'object' && pet !== null && 'name' in pet) {
    return pet.name || 'Chưa rõ';
  }
  if (typeof pet === 'string') {
    return pet;
  }
  return 'Chưa rõ';
};

/** Lấy tên chủ nuôi an toàn từ ownerId (dạng object hoặc string) */
export const getAppointmentOwnerName = (
  owner?: PopulatedOwnerRef | string | null
): string => {
  if (!owner) return 'Chưa rõ';
  if (typeof owner === 'object' && owner !== null && 'fullName' in owner) {
    return owner.fullName || 'Chưa rõ';
  }
  if (typeof owner === 'string') {
    return owner;
  }
  return 'Chưa rõ';
};

/** Lấy số điện thoại chủ nuôi an toàn từ ownerId (dạng object hoặc string) */
export const getAppointmentOwnerPhone = (
  owner?: PopulatedOwnerRef | string | null
): string => {
  if (!owner) return '-';
  if (typeof owner === 'object' && owner !== null && 'phone' in owner) {
    return owner.phone || '-';
  }
  return '-';
};

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Array<string | { field?: string; message?: string }>;
    };
  };
  message?: string;
}

export interface ExtractedApiError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
  statusCode?: number;
}

/** Trích xuất message và fieldErrors từ backend error response */
export const extractApiError = (
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra'
): ExtractedApiError => {
  const candidate = error as ApiErrorShape | undefined;
  const status = candidate?.response?.status;
  const data = candidate?.response?.data;
  const message = data?.message || candidate?.message || fallbackMessage;
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      if (typeof item === 'string') {
        fieldErrors.general = item;
      } else if (item && typeof item === 'object') {
        if (item.field && item.message) {
          fieldErrors[item.field] = item.message;
        } else if (item.message) {
          fieldErrors.general = item.message;
        }
      }
    }
  }

  return { message, fieldErrors, status, statusCode: status };
};
