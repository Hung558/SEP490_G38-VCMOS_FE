import type {
  CreateOnlineAppointmentServicePayload,
  CreateCombinedOnlineBookingPayload,
  CreateOnlineBookingServiceItem,
  AppointmentServiceStatus,
  PopulatedServiceRef,
  PopulatedStaffRef,
  QueueOrderRef,
} from './types';

const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const BLOCKED_ORDER_STATUSES = ['Done', 'Cancelled', 'Overdue'] as const;

/**
 * Kiểm tra an toàn xem đối tượng user có quyền PetOwner hay không:
 * - Hỗ trợ cả trường `role` và `systemRole`
 * - Chuẩn hóa và không phân biệt hoa thường
 */
export const isUserPetOwner = (userCandidate?: unknown): boolean => {
  if (!userCandidate || typeof userCandidate !== 'object') return false;
  const u = userCandidate as { role?: string; systemRole?: string };
  const rawRole = u.role || u.systemRole;
  return (
    typeof rawRole === 'string' && rawRole.trim().toLowerCase() === 'petowner'
  );
};

/**
 * Kiểm tra chuỗi có phải là ObjectId 24 ký tự hex hợp lệ hay không
 */
export const isValidMongoObjectId = (id: unknown): boolean => {
  if (typeof id !== 'string') return false;
  return MONGO_OBJECT_ID_REGEX.test(id.trim());
};

/**
 * Kiểm tra xem lịch hẹn có đủ điều kiện để chủ nuôi thêm dịch vụ hay không:
 * - Phải là lịch hẹn trực tuyến (isOnline === true)
 * - Trạng thái không nằm trong nhóm kết thúc/chặn: Done, Cancelled, Overdue
 */
export const isAppointmentEligibleForService = (
  appointment?: { isOnline?: boolean; derivedStatus?: string } | null
): boolean => {
  if (!appointment) return false;
  if (!appointment.isOnline) return false;
  if (!appointment.derivedStatus) return false;
  return !BLOCKED_ORDER_STATUSES.includes(
    appointment.derivedStatus as (typeof BLOCKED_ORDER_STATUSES)[number]
  );
};

export interface AppointmentServiceFormValidationResult {
  isValid: boolean;
  errors: {
    orderId?: string;
    serviceId?: string;
    sequenceNo?: string;
    isEmergency?: string;
  };
}

/**
 * Kiểm tra hợp lệ dữ liệu form thêm dịch vụ trước khi submit
 */
export const validateAppointmentServiceForm = (values: {
  orderId?: unknown;
  serviceId?: unknown;
  sequenceNo?: unknown;
  isEmergency?: unknown;
}): AppointmentServiceFormValidationResult => {
  const errors: AppointmentServiceFormValidationResult['errors'] = {};

  // 1. orderId
  if (typeof values.orderId !== 'string' || !values.orderId.trim()) {
    errors.orderId = 'orderId là bắt buộc';
  } else if (!isValidMongoObjectId(values.orderId)) {
    errors.orderId = 'orderId không hợp lệ';
  }

  // 2. serviceId
  if (typeof values.serviceId !== 'string' || !values.serviceId.trim()) {
    errors.serviceId = 'serviceId là bắt buộc';
  } else if (!isValidMongoObjectId(values.serviceId)) {
    errors.serviceId = 'serviceId không hợp lệ';
  }

  // 3. sequenceNo (tùy chọn - nếu truyền thì phải là số nguyên dương)
  if (
    values.sequenceNo !== undefined &&
    values.sequenceNo !== null &&
    values.sequenceNo !== ''
  ) {
    const seqNum = Number(values.sequenceNo);
    if (!Number.isInteger(seqNum) || seqNum < 1) {
      errors.sequenceNo = 'sequenceNo phải là số nguyên dương';
    }
  }

  // 4. isEmergency (tùy chọn - nếu truyền thì phải là boolean)
  if (
    values.isEmergency !== undefined &&
    values.isEmergency !== null &&
    typeof values.isEmergency !== 'boolean'
  ) {
    errors.isEmergency = 'isEmergency phải là true hoặc false';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Chuẩn hóa và lọc chỉ giữ lại đúng các trường được phép trong BE contract:
 * { orderId, serviceId, sequenceNo?, isEmergency? }
 *
 * Loại bỏ tuyệt đối: ownerId, preferredStaffId, assignedStaffId, status,
 * queueNo, enqueueAt, dequeueAt, groomingNote và bất kỳ trường ngoài nào khác.
 */
export const buildCreateOnlineAppointmentServicePayload = (
  data:
    | CreateOnlineAppointmentServicePayload
    | (Partial<CreateOnlineAppointmentServicePayload> & Record<string, unknown>)
): CreateOnlineAppointmentServicePayload => {
  const anyData = data as Record<string, unknown>;
  const payload: CreateOnlineAppointmentServicePayload = {
    orderId: String(anyData.orderId || '').trim(),
    serviceId: String(anyData.serviceId || '').trim(),
  };

  const seqVal = anyData.sequenceNo;
  if (seqVal !== undefined && seqVal !== null && (seqVal as unknown) !== '') {
    const seq = Number(seqVal);
    if (Number.isInteger(seq) && seq > 0) {
      payload.sequenceNo = seq;
    }
  }

  if (typeof anyData.isEmergency === 'boolean') {
    payload.isEmergency = anyData.isEmergency;
  }

  return payload;
};

export interface ExtractedAppointmentServiceError {
  message: string;
  statusCode?: number;
  status?: number;
  fieldErrors?: Record<string, string>;
}

/**
 * Trích xuất lỗi chi tiết từ Axios Error response theo format BE trả về
 */
export const extractApiError = (
  err: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
): ExtractedAppointmentServiceError => {
  if (!err || typeof err !== 'object') {
    return { message: fallbackMessage };
  }

  const anyErr = err as {
    response?: {
      status?: number;
      data?: {
        message?: string | string[];
        error?: string;
        errors?:
          | Record<string, string>
          | Array<string | { field?: string; message?: string }>;
      };
    };
    message?: string;
  };

  const status = anyErr.response?.status;
  const resData = anyErr.response?.data;

  let fieldErrors: Record<string, string> | undefined;
  if (Array.isArray(resData?.errors)) {
    fieldErrors = {};
    for (const item of resData.errors) {
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
  } else if (resData?.errors && typeof resData.errors === 'object') {
    fieldErrors = resData.errors as Record<string, string>;
  }

  if (resData) {
    if (typeof resData.message === 'string' && resData.message.trim()) {
      return {
        message: resData.message.trim(),
        status,
        statusCode: status,
        fieldErrors,
      };
    }

    if (Array.isArray(resData.message) && resData.message.length > 0) {
      return {
        message: resData.message.join(', '),
        status,
        statusCode: status,
        fieldErrors,
      };
    }

    if (typeof resData.error === 'string' && resData.error.trim()) {
      return {
        message: resData.error.trim(),
        status,
        statusCode: status,
        fieldErrors,
      };
    }
  }

  if (status === 401) {
    return {
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      status: 401,
      statusCode: 401,
    };
  }

  if (status === 403) {
    return {
      message: 'Bạn không có quyền thực hiện thao tác này.',
      status: 403,
      statusCode: 403,
    };
  }

  if (status === 404) {
    return {
      message: 'Không tìm thấy dữ liệu yêu cầu.',
      status: 404,
      statusCode: 404,
    };
  }

  if (status === 409) {
    return {
      message: 'Dữ liệu bị trùng lặp hoặc xung đột.',
      status: 409,
      statusCode: 409,
    };
  }

  if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
    return {
      message: anyErr.message.trim(),
      status,
      statusCode: status,
    };
  }

  return { message: fallbackMessage, status, statusCode: status };
};

/**
 * Chuẩn hóa và lọc chỉ giữ lại đúng các trường được phép trong BE contract cho create online booking:
 * POST /api/appointment-services/online-booking
 *
 * Payload whitelist:
 * {
 *   petId: string,
 *   date: string (YYYY-MM-DD),
 *   note?: string,
 *   services: Array<{ serviceId: string, sequenceNo?: number, isEmergency?: boolean }>
 * }
 *
 * Loại bỏ tuyệt đối: ownerId, code, isOnline, derivedStatus, checkedInAt,
 * orderId, preferredStaffId, assignedStaffId, status, queueNo, enqueueAt, dequeueAt, groomingNote.
 */
export const buildCreateOnlineBookingPayload = (
  data:
    | CreateCombinedOnlineBookingPayload
    | (Partial<CreateCombinedOnlineBookingPayload> & Record<string, unknown>)
): CreateCombinedOnlineBookingPayload => {
  const anyData = data as Record<string, unknown>;
  const payload: CreateCombinedOnlineBookingPayload = {
    petId: String(anyData.petId || '').trim(),
    date: String(anyData.date || '').trim(),
    services: [],
  };

  if (typeof anyData.note === 'string' && anyData.note.trim()) {
    payload.note = anyData.note.trim();
  }

  if (typeof anyData.slotStart === 'string' && anyData.slotStart.trim()) {
    payload.slotStart = anyData.slotStart.trim();
  }

  const rawServices = Array.isArray(anyData.services) ? anyData.services : [];
  payload.services = rawServices.map((item: unknown) => {
    const rawItem = (item && typeof item === 'object' ? item : {}) as Record<
      string,
      unknown
    >;
    const cleanItem: CreateOnlineBookingServiceItem = {
      serviceId: String(rawItem.serviceId || '').trim(),
    };

    const seqVal = rawItem.sequenceNo;
    if (seqVal !== undefined && seqVal !== null && (seqVal as unknown) !== '') {
      const seq = Number(seqVal);
      if (Number.isInteger(seq) && seq > 0) {
        cleanItem.sequenceNo = seq;
      }
    }

    if (typeof rawItem.isEmergency === 'boolean') {
      cleanItem.isEmergency = rawItem.isEmergency;
    }

    return cleanItem;
  });

  return payload;
};

/**
 * Lấy ngày hiện tại theo giờ Việt Nam (Asia/Ho_Chi_Minh) dạng YYYY-MM-DD
 */
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

/**
 * Lấy giờ hiện tại theo giờ Việt Nam (Asia/Ho_Chi_Minh) dạng HH:mm
 */
export const getVietnamCurrentTime = (now = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  } catch {
    const d = now;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};

const CLINIC_OPEN_MINUTES = 8 * 60;
const CLINIC_CLOSE_MINUTES = 18 * 60;
const BOOKING_SLOT_STEP = 30;
const DEFAULT_SERVICE_DURATION = 30;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PAST_SLOT_ERROR = 'Giờ hẹn không được ở trong quá khứ';
const LATE_END_ERROR = 'Tổng thời lượng dịch vụ vượt quá giờ đóng cửa (18:00)';

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toHHmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;

// Keep the estimate consistent with the duration fallback in the booking API.
export const getBookingServiceDuration = (raw: unknown): number => {
  const duration =
    typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(duration) && duration > 0
    ? duration
    : DEFAULT_SERVICE_DURATION;
};

const getTodayCutoff = (date: string | undefined, now: Date): string =>
  date?.trim() === getVietnamTodayString(now) ? getVietnamCurrentTime(now) : '';

const getSlotAvailabilityError = (
  start: string,
  duration: number,
  cutoff: string
) => {
  if (cutoff && start <= cutoff) return PAST_SLOT_ERROR;
  if (toMinutes(start) + duration > CLINIC_CLOSE_MINUTES) return LATE_END_ERROR;
  return undefined;
};

/** Validate a supplied time. Older API callers may still omit it. */
export const validateSlotStart = (
  slotStart?: string,
  date?: string,
  {
    totalDuration = 0,
    now = new Date(),
  }: { totalDuration?: number; now?: Date } = {}
): string | undefined => {
  const start = typeof slotStart === 'string' ? slotStart.trim() : '';
  if (!start) return undefined;
  if (!TIME_PATTERN.test(start)) return 'Khung giờ phải đúng định dạng HH:mm';
  const minutes = toMinutes(start);
  if (minutes < CLINIC_OPEN_MINUTES || minutes >= CLINIC_CLOSE_MINUTES) {
    return 'Giờ hẹn phải nằm trong khung giờ làm việc (08:00 - 18:00)';
  }
  return getSlotAvailabilityError(
    start,
    totalDuration,
    getTodayCutoff(date, now)
  );
};

export const getClinicBookingSlots = (
  date: string,
  totalDuration: number,
  now = new Date()
) => {
  const cutoff = getTodayCutoff(date, now);
  const count =
    (CLINIC_CLOSE_MINUTES - CLINIC_OPEN_MINUTES) / BOOKING_SLOT_STEP;
  return Array.from({ length: count }, (_, index) => {
    const value = toHHmm(CLINIC_OPEN_MINUTES + index * BOOKING_SLOT_STEP);
    const error = getSlotAvailabilityError(value, totalDuration, cutoff);
    const reason =
      error === PAST_SLOT_ERROR ? 'Đã qua giờ này' : 'Kết thúc sau 18:00';
    return {
      value,
      label: error ? `${value} (${reason})` : value,
      disabled: Boolean(error),
    };
  });
};

export const getEstimatedBookingEnd = (
  start: string,
  duration: number
): string | undefined => {
  if (duration <= 0 || !TIME_PATTERN.test(start)) return undefined;
  const minutes = toMinutes(start);
  const end = minutes + duration;
  if (minutes < CLINIC_OPEN_MINUTES || end > CLINIC_CLOSE_MINUTES)
    return undefined;
  return toHHmm(end);
};

/**
 * Validate lý do hủy lịch hẹn / dịch vụ:
 * - Bắt buộc nhập chuỗi không rỗng
 * - Tối đa 200 ký tự (theo hợp đồng BE)
 */
export const validateCancelReason = (reason?: unknown): string | undefined => {
  if (typeof reason !== 'string' || !reason.trim()) {
    return 'Lý do hủy là bắt buộc';
  }
  if (reason.trim().length > 200) {
    return 'Lý do hủy tối đa 200 ký tự';
  }
  return undefined;
};

/**
 * Validate ngày đặt lịch: đúng định dạng YYYY-MM-DD, là ngày thật và không ở quá khứ
 */
export const validateBookingDate = (
  date?: string,
  now = new Date()
): string | undefined => {
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

  const todayStr = getVietnamTodayString(now);
  if (trimmed < todayStr) {
    return 'Ngày hẹn không được ở trong quá khứ';
  }

  return undefined;
};

/**
 * Validate ghi chú đặt lịch: chuỗi, tối đa 500 ký tự
 */
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

export interface OnlineBookingFormValidationResult {
  isValid: boolean;
  errors: {
    petId?: string;
    date?: string;
    slotStart?: string;
    note?: string;
    services?: string;
    serviceErrors?: Array<{
      serviceId?: string;
      sequenceNo?: string;
      isEmergency?: string;
    }>;
  };
}

/**
 * Kiểm tra hợp lệ dữ liệu form đặt lịch online kèm dịch vụ trước khi submit
 */
export const validateOnlineBookingForm = (
  values: {
    petId?: unknown;
    date?: unknown;
    slotStart?: unknown;
    note?: unknown;
    services?: unknown;
  },
  {
    totalDuration = 0,
    now = new Date(),
  }: { totalDuration?: number; now?: Date } = {}
): OnlineBookingFormValidationResult => {
  const errors: OnlineBookingFormValidationResult['errors'] = {};

  // 1. petId
  if (typeof values.petId !== 'string' || !values.petId.trim()) {
    errors.petId = 'petId là bắt buộc';
  } else if (!isValidMongoObjectId(values.petId)) {
    errors.petId = 'petId không hợp lệ';
  }

  // 2. date
  const dateStr = typeof values.date === 'string' ? values.date : '';
  const dateErr = validateBookingDate(dateStr, now);
  if (dateErr) {
    errors.date = dateErr;
  }

  // 3. slotStart (required on the new booking form, not on the legacy API)
  const slotStartStr =
    typeof values.slotStart === 'string' ? values.slotStart.trim() : '';
  const slotErr = slotStartStr
    ? validateSlotStart(slotStartStr, dateStr, { totalDuration, now })
    : 'Vui lòng chọn giờ hẹn';
  if (slotErr) {
    errors.slotStart = slotErr;
  }

  // 4. note (optional)
  const noteErr = validateBookingNote(values.note);
  if (noteErr) {
    errors.note = noteErr;
  }

  // 5. services
  if (!Array.isArray(values.services) || values.services.length === 0) {
    errors.services = 'Lịch hẹn phải có ít nhất một dịch vụ';
  } else {
    const serviceErrors: NonNullable<
      OnlineBookingFormValidationResult['errors']['serviceErrors']
    > = [];
    const seenSequences = new Set<number>();
    let hasItemError = false;

    values.services.forEach((item, index) => {
      const itemErrors: {
        serviceId?: string;
        sequenceNo?: string;
        isEmergency?: string;
      } = {};
      if (!item || typeof item !== 'object') {
        itemErrors.serviceId = `services[${index}] không hợp lệ`;
        hasItemError = true;
      } else {
        const raw = item as Record<string, unknown>;
        if (typeof raw.serviceId !== 'string' || !raw.serviceId.trim()) {
          itemErrors.serviceId = 'serviceId là bắt buộc';
          hasItemError = true;
        } else if (!isValidMongoObjectId(raw.serviceId)) {
          itemErrors.serviceId = 'serviceId không hợp lệ';
          hasItemError = true;
        }

        if (
          raw.sequenceNo !== undefined &&
          raw.sequenceNo !== null &&
          (raw.sequenceNo as unknown) !== ''
        ) {
          const seq = Number(raw.sequenceNo);
          if (!Number.isInteger(seq) || seq < 1) {
            itemErrors.sequenceNo = 'sequenceNo phải là số nguyên dương';
            hasItemError = true;
          } else if (seenSequences.has(seq)) {
            itemErrors.sequenceNo =
              'Số thứ tự dịch vụ bị trùng trong lịch hẹn này';
            hasItemError = true;
          } else {
            seenSequences.add(seq);
          }
        }

        if (
          raw.isEmergency !== undefined &&
          raw.isEmergency !== null &&
          typeof raw.isEmergency !== 'boolean'
        ) {
          itemErrors.isEmergency = 'isEmergency phải là true hoặc false';
          hasItemError = true;
        }
      }
      serviceErrors.push(itemErrors);
    });

    if (hasItemError) {
      errors.serviceErrors = serviceErrors;
      if (!errors.services) {
        errors.services = 'Một số thông tin dịch vụ chưa hợp lệ';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Trả về nhãn tiếng Việt cho trạng thái dịch vụ lịch hẹn
 */
export const getAppointmentServiceStatusLabel = (
  status?: AppointmentServiceStatus | string
): string => {
  switch (status) {
    case 'Booked':
      return 'Đã đặt';
    case 'Waiting':
      return 'Chờ thực hiện';
    case 'InProgress':
      return 'Đang thực hiện';
    case 'Done':
      return 'Hoàn tất';
    case 'Cancelled':
      return 'Đã hủy';
    case 'Overdue':
      return 'Quá hạn';
    default:
      return status || '—';
  }
};

/**
 * Trả về màu tag AntD cho trạng thái dịch vụ lịch hẹn
 */
export const getAppointmentServiceStatusColor = (
  status?: AppointmentServiceStatus | string
): string => {
  switch (status) {
    case 'Booked':
      return 'blue';
    case 'Waiting':
      return 'orange';
    case 'InProgress':
      return 'processing';
    case 'Done':
      return 'success';
    case 'Cancelled':
      return 'error';
    case 'Overdue':
      return 'default';
    default:
      return 'default';
  }
};

/**
 * Lọc danh sách dịch vụ chỉ giữ lại các dịch vụ có status === 'Active'.
 * Phòng thủ chống dữ liệu stale hoặc inactive từ API/cache trước khi render/cho phép chọn.
 */
export const filterActiveServices = <T extends { status?: string }>(
  services?: T[] | null
): T[] => {
  if (!Array.isArray(services)) return [];
  return services.filter(s => s && s.status === 'Active');
};

/**
 * Lấy tên dịch vụ một cách an toàn từ ref đã populate hoặc string ID
 */
export const getAppointmentServiceName = (serviceRef: unknown): string => {
  if (!serviceRef) return '—';
  if (typeof serviceRef === 'string')
    return `Dịch vụ (${serviceRef.slice(-6)})`;
  if (typeof serviceRef === 'object') {
    const s = serviceRef as PopulatedServiceRef;
    return s.name || `Dịch vụ (${s._id?.slice(-6) || '—'})`;
  }
  return '—';
};

/**
 * Lấy tên nhân viên một cách an toàn từ ref đã populate hoặc string ID
 */
export const getAppointmentServiceStaffName = (staffRef: unknown): string => {
  if (!staffRef) return '—';
  if (typeof staffRef === 'string') return `Nhân viên (${staffRef.slice(-6)})`;
  if (typeof staffRef === 'object') {
    const s = staffRef as PopulatedStaffRef;
    return s.fullName || `Nhân viên (${s._id?.slice(-6) || '—'})`;
  }
  return '—';
};

/** Lấy _id nhân viên từ ref đã populate hoặc string ID */
export const getStaffRefId = (staffRef: unknown): string | undefined => {
  if (!staffRef) return undefined;
  if (typeof staffRef === 'string') return staffRef;
  if (typeof staffRef === 'object' && '_id' in staffRef) {
    return String((staffRef as PopulatedStaffRef)._id);
  }
  return undefined;
};

/** Nhóm dịch vụ (category) khi serviceId đã được populate */
export const getServiceRefCategory = (
  serviceRef: unknown
): string | undefined =>
  serviceRef && typeof serviceRef === 'object'
    ? (serviceRef as PopulatedServiceRef).category
    : undefined;

/** Dịch vụ ở các trạng thái này không phân công lại được (BE trả 409) */
export const ASSIGN_LOCKED_SERVICE_STATUSES = [
  'InProgress',
  'Done',
  'Cancelled',
  'Overdue',
] as const;

/**
 * Lịch đã check-in hoặc đang thực hiện: dịch vụ được phân công sẽ vào hàng đợi ngay.
 * Lịch chưa check-in: dịch vụ đã phân công tự vào hàng đợi lúc check-in.
 */
export const isQueueingOrder = (orderStatus?: string): boolean =>
  orderStatus === 'CheckedIn' || orderStatus === 'InProgress';

/** Lý do không phân công được nhân sự cho dịch vụ; undefined nếu được phép */
export const getAssignStaffBlockReason = (
  serviceStatus?: string,
  orderStatus?: string
): string | undefined => {
  if (
    BLOCKED_ORDER_STATUSES.includes(
      orderStatus as (typeof BLOCKED_ORDER_STATUSES)[number]
    )
  ) {
    return 'Lịch hẹn đã hoàn tất, bị hủy hoặc quá hạn nên không thể phân công.';
  }
  if (
    ASSIGN_LOCKED_SERVICE_STATUSES.includes(
      serviceStatus as (typeof ASSIGN_LOCKED_SERVICE_STATUSES)[number]
    )
  ) {
    return `Dịch vụ đang ở trạng thái "${getAppointmentServiceStatusLabel(
      serviceStatus
    )}" nên không thể phân công lại.`;
  }
  return undefined;
};

/**
 * Có nên gửi phân công không: phải chọn một người khác người đang phụ trách
 * (gửi lại đúng người cũ chỉ làm BE cấp số thứ tự mới, đẩy dịch vụ xuống cuối hàng)
 */
export const canSubmitAssignment = (
  service: { status?: string; assignedStaffId?: unknown },
  orderStatus: string | undefined,
  selectedStaffId?: string
): boolean => {
  if (!selectedStaffId) return false;
  if (getAssignStaffBlockReason(service.status, orderStatus)) return false;
  return selectedStaffId !== getStaffRefId(service.assignedStaffId);
};

export type QueueView = 'active' | 'booked' | 'done' | 'all';

/** Các nhóm của hàng đợi nhân viên (SCR-22, SCR-26) */
export const QUEUE_VIEWS: readonly {
  key: QueueView;
  label: string;
  statuses?: readonly string[];
}[] = [
  {
    key: 'active',
    label: 'Đang chờ và đang làm',
    statuses: ['Waiting', 'InProgress'],
  },
  { key: 'booked', label: 'Chờ khách check-in', statuses: ['Booked'] },
  { key: 'done', label: 'Đã xong', statuses: ['Done'] },
  { key: 'all', label: 'Tất cả' },
];

/** Lịch hẹn của một dịch vụ trong hàng đợi (BE populate cả đơn) */
export const getQueueOrder = (item: {
  orderId?: unknown;
}): QueueOrderRef | null =>
  item.orderId && typeof item.orderId === 'object'
    ? (item.orderId as QueueOrderRef)
    : null;

/** Lọc hàng đợi theo nhóm trạng thái, và khi `todayOnly` thì chỉ lịch hẹn ngày `today` */
export const filterMyQueue = <T extends { status?: string; orderId?: unknown }>(
  items: T[] | null | undefined,
  view: QueueView,
  todayOnly: boolean,
  today: string
): T[] => {
  const statuses = QUEUE_VIEWS.find(v => v.key === view)?.statuses;
  return (items || []).filter(
    item =>
      (!statuses || statuses.includes(item.status || '')) &&
      (!todayOnly || getQueueOrder(item)?.date === today)
  );
};

/** Số dịch vụ của từng nhóm, để hiện trên bộ lọc */
export const countMyQueue = <T extends { status?: string; orderId?: unknown }>(
  items: T[] | null | undefined,
  todayOnly: boolean,
  today: string
): Record<QueueView, number> =>
  QUEUE_VIEWS.reduce(
    (acc, view) => {
      acc[view.key] = filterMyQueue(items, view.key, todayOnly, today).length;
      return acc;
    },
    {} as Record<QueueView, number>
  );

export type ExamAction = 'waitCheckIn' | 'start' | 'continue' | 'view';

/** Bác sĩ làm được gì với một ca trong hàng đợi; null với Groomer và dịch vụ Grooming */
export const getExamAction = (
  item: { status?: string; serviceId?: unknown },
  role?: string
): ExamAction | null => {
  const category = getServiceRefCategory(item.serviceId);
  if (role !== 'Veterinarian' || !category || category === 'Grooming') {
    return null;
  }
  switch (item.status) {
    case 'Booked':
      return 'waitCheckIn';
    case 'Waiting':
      return 'start';
    case 'InProgress':
      return 'continue';
    case 'Done':
      return 'view';
    default:
      return null;
  }
};
