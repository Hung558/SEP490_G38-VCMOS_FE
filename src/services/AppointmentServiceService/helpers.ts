import type { CreateOnlineAppointmentServicePayload } from './types';

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
