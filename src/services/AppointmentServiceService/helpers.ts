import type {
  CreateOnlineAppointmentServicePayload,
  CreateCombinedOnlineBookingPayload,
  CreateOnlineBookingServiceItem,
  AppointmentServiceStatus,
  PopulatedServiceRef,
  PopulatedStaffRef,
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

/**
 * Trích xuất lỗi chi tiết từ Axios Error response theo format BE trả về
 */
export const extractApiError = (
  err: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
): {
  message: string;
  statusCode?: number;
  fieldErrors?: Record<string, string>;
} => {
  if (!err || typeof err !== 'object') {
    return { message: fallbackMessage };
  }

  const anyErr = err as {
    response?: {
      status?: number;
      data?: {
        message?: string | string[];
        error?: string;
        errors?: Record<string, string>;
      };
    };
    message?: string;
  };

  const status = anyErr.response?.status;
  const resData = anyErr.response?.data;

  if (resData) {
    if (typeof resData.message === 'string' && resData.message.trim()) {
      return {
        message: resData.message.trim(),
        statusCode: status,
        fieldErrors: resData.errors,
      };
    }

    if (Array.isArray(resData.message) && resData.message.length > 0) {
      return {
        message: resData.message.join(', '),
        statusCode: status,
        fieldErrors: resData.errors,
      };
    }

    if (typeof resData.error === 'string' && resData.error.trim()) {
      return {
        message: resData.error.trim(),
        statusCode: status,
        fieldErrors: resData.errors,
      };
    }
  }

  if (status === 401) {
    return {
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      statusCode: 401,
    };
  }

  if (status === 403) {
    return {
      message: 'Bạn không có quyền thực hiện thao tác này.',
      statusCode: 403,
    };
  }

  if (status === 404) {
    return {
      message: 'Không tìm thấy dữ liệu yêu cầu.',
      statusCode: 404,
    };
  }

  if (status === 409) {
    return {
      message: 'Dữ liệu bị trùng lặp hoặc xung đột.',
      statusCode: 409,
    };
  }

  if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
    return {
      message: anyErr.message.trim(),
      statusCode: status,
    };
  }

  return { message: fallbackMessage, statusCode: status };
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
export const getVietnamTodayString = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
};

/**
 * Validate ngày đặt lịch: đúng định dạng YYYY-MM-DD, là ngày thật và không ở quá khứ
 */
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
export const validateOnlineBookingForm = (values: {
  petId?: unknown;
  date?: unknown;
  note?: unknown;
  services?: unknown;
}): OnlineBookingFormValidationResult => {
  const errors: OnlineBookingFormValidationResult['errors'] = {};

  // 1. petId
  if (typeof values.petId !== 'string' || !values.petId.trim()) {
    errors.petId = 'petId là bắt buộc';
  } else if (!isValidMongoObjectId(values.petId)) {
    errors.petId = 'petId không hợp lệ';
  }

  // 2. date
  const dateStr = typeof values.date === 'string' ? values.date : '';
  const dateErr = validateBookingDate(dateStr);
  if (dateErr) {
    errors.date = dateErr;
  }

  // 3. note (optional)
  const noteErr = validateBookingNote(values.note);
  if (noteErr) {
    errors.note = noteErr;
  }

  // 4. services
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
