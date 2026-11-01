import type {
  ServiceCategory,
  ServiceFieldErrors,
  ServiceFilters,
  ServiceStatus,
  ServiceWritePayload,
} from './types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Examination',
  'Vaccination',
  'Grooming',
  'Paraclinical',
  'Inpatient',
];

export const SERVICE_STATUSES: ServiceStatus[] = ['Active', 'Inactive'];

export const SERVICE_NAME_MIN = 3;
export const SERVICE_NAME_MAX = 100;
export const SERVICE_DURATION_MIN = 5;
export const SERVICE_DURATION_MAX = 480;
export const SERVICE_DESCRIPTION_MAX = 500;

export const serviceCategoryLabels: Record<ServiceCategory, string> = {
  Examination: 'Khám bệnh',
  Vaccination: 'Tiêm phòng',
  Grooming: 'Chăm sóc / làm đẹp',
  Paraclinical: 'Cận lâm sàng',
  Inpatient: 'Lưu trú / nội trú',
};

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  Active: 'Đang cung cấp',
  Inactive: 'Ngừng cung cấp',
};

/** BE yêu cầu tên 3-100 ký tự sau khi trim. */
export const validateServiceName = (value: unknown): string | undefined => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'Tên dịch vụ là bắt buộc';
  if (name.length < SERVICE_NAME_MIN) {
    return `Tên dịch vụ phải có ít nhất ${SERVICE_NAME_MIN} ký tự`;
  }
  if (name.length > SERVICE_NAME_MAX) {
    return `Tên dịch vụ không được vượt quá ${SERVICE_NAME_MAX} ký tự`;
  }
  return undefined;
};

export const validateServiceCategory = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value)
    return 'Danh mục dịch vụ là bắt buộc';
  if (!SERVICE_CATEGORIES.includes(value as ServiceCategory)) {
    return 'Danh mục dịch vụ không hợp lệ';
  }
  return undefined;
};

/** BE yêu cầu số nguyên 5-480 phút. */
export const validateServiceDuration = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return 'Thời lượng thực hiện là bắt buộc';
  }
  const duration = Number(value);
  if (
    !Number.isInteger(duration) ||
    duration < SERVICE_DURATION_MIN ||
    duration > SERVICE_DURATION_MAX
  ) {
    return `Thời lượng thực hiện phải là số nguyên từ ${SERVICE_DURATION_MIN} đến ${SERVICE_DURATION_MAX} phút`;
  }
  return undefined;
};

/** BE chỉ yêu cầu số hữu hạn >= 0, không giới hạn phần thập phân. */
export const validateServicePrice = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return 'Giá niêm yết là bắt buộc';
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    return 'Giá niêm yết phải là số lớn hơn hoặc bằng 0';
  }
  return undefined;
};

export const validateServiceDescription = (
  value: unknown
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return 'Mô tả dịch vụ không hợp lệ';
  if (value.trim().length > SERVICE_DESCRIPTION_MAX) {
    return `Mô tả dịch vụ không được vượt quá ${SERVICE_DESCRIPTION_MAX} ký tự`;
  }
  return undefined;
};

export interface ServiceFormValues {
  name?: string;
  category?: ServiceCategory;
  defaultDuration?: number | null;
  basePrice?: number | null;
  description?: string;
  status?: ServiceStatus;
}

export interface ServiceFormValidation {
  isValid: boolean;
  errors: ServiceFieldErrors;
}

export const validateServiceForm = (
  values: ServiceFormValues = {}
): ServiceFormValidation => {
  const errors: ServiceFieldErrors = {};
  const nameError = validateServiceName(values.name);
  if (nameError) errors.name = nameError;
  const categoryError = validateServiceCategory(values.category);
  if (categoryError) errors.category = categoryError;
  const durationError = validateServiceDuration(values.defaultDuration);
  if (durationError) errors.defaultDuration = durationError;
  const priceError = validateServicePrice(values.basePrice);
  if (priceError) errors.basePrice = priceError;
  const descriptionError = validateServiceDescription(values.description);
  if (descriptionError) errors.description = descriptionError;

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Chuyển giá trị form thành body POST/PUT.
 * Chỉ gửi field BE chấp nhận; `description: ''` để xóa mô tả khi cập nhật.
 */
export const buildServicePayload = (
  values: ServiceFormValues,
  options: { includeStatus?: boolean } = {}
): ServiceWritePayload => {
  const payload: ServiceWritePayload = {
    name: String(values.name ?? '').trim(),
    category: values.category as ServiceCategory,
    defaultDuration: Number(values.defaultDuration),
    basePrice: Number(values.basePrice),
  };

  if (typeof values.description === 'string') {
    payload.description = values.description.trim();
  }
  if (options.includeStatus && values.status) {
    payload.status = values.status;
  }

  return payload;
};

/** Bỏ filter rỗng để không gửi query thừa lên API. */
export const buildServiceQuery = (
  filters: ServiceFilters = {}
): ServiceFilters => {
  const query: ServiceFilters = {};
  const search =
    typeof filters.search === 'string' ? filters.search.trim() : '';
  if (search) query.search = search;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  return query;
};

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
});

export const formatServicePrice = (price?: number | null): string =>
  typeof price === 'number' && Number.isFinite(price)
    ? `${priceFormatter.format(price)} đ`
    : '—';

export const formatServiceDuration = (duration?: number | null): string =>
  typeof duration === 'number' && Number.isFinite(duration)
    ? `${duration} phút`
    : '—';

export interface ApiErrorDetails {
  message: string;
  fieldErrors: ServiceFieldErrors;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Interceptor hiện chỉ reject HTTP error; đọc message cùng `errors` do BE trả về.
 */
export const extractApiError = (
  error: unknown,
  fallback: string
): ApiErrorDetails => {
  const fieldErrors: ServiceFieldErrors = {};
  const response =
    isRecord(error) && isRecord(error.response) ? error.response : undefined;
  const data = response && isRecord(response.data) ? response.data : undefined;

  if (data && isRecord(data.errors)) {
    for (const [field, message] of Object.entries(data.errors)) {
      if (typeof message === 'string') {
        fieldErrors[field as keyof ServiceFieldErrors] = message;
      }
    }
  }

  const message =
    (data && typeof data.message === 'string' && data.message) ||
    (isRecord(error) && typeof error.message === 'string' && error.message) ||
    fallback;

  return { message, fieldErrors };
};
