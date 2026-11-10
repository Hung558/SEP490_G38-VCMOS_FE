import type {
  Cage,
  CageCreatePayload,
  CageFieldErrors,
  CageFormValues,
  CageListParams,
  CageSize,
  CageSort,
  CageStatus,
  CageUpdatePayload,
} from '../../types/api/cage.api.ts';

// BR-11: tải trọng tối đa theo cỡ chuồng, giống canCageAccommodatePet của BE
export const CAGE_MAX_WEIGHT_BY_SIZE: Record<CageSize, number> = {
  S: 5,
  M: 15,
  L: 30,
  XL: Infinity,
};

/**
 * Chuồng có nhận được thú cưng này không (BR-11): cờ cách ly phải khớp nhu cầu cách ly,
 * và cân nặng (nếu biết) không vượt tải trọng của chuồng. Chuồng khu nội trú không dùng
 * để giữ thú cưng chờ khám.
 */
export const canCageHoldPet = (
  cage: Pick<Cage, 'size' | 'isIsolated' | 'maxWeightKg' | 'zone'>,
  petWeight?: number | null,
  requiresIsolation = false
): boolean => {
  if (cage.zone === 'InpatientWard') return false;
  if (Boolean(cage.isIsolated) !== Boolean(requiresIsolation)) return false;
  if (
    typeof petWeight === 'number' &&
    Number.isFinite(petWeight) &&
    petWeight > 0
  ) {
    const limit =
      typeof cage.maxWeightKg === 'number' && cage.maxWeightKg > 0
        ? cage.maxWeightKg
        : CAGE_MAX_WEIGHT_BY_SIZE[cage.size];
    if (limit !== undefined && petWeight > limit) return false;
  }
  return true;
};

export const CAGE_SIZES: CageSize[] = ['S', 'M', 'L', 'XL'];
export const CAGE_STATUSES: CageStatus[] = ['Available', 'Occupied'];
export const CAGE_SORTS: CageSort[] = [
  'label',
  '-label',
  'size',
  '-size',
  'status',
  '-status',
  'createdAt',
  '-createdAt',
  'updatedAt',
  '-updatedAt',
];

export const cageStatusLabels: Record<CageStatus, string> = {
  Available: 'Sẵn sàng',
  Occupied: 'Đang sử dụng',
};

export const cageStatusColors: Record<CageStatus, string> = {
  Available: 'green',
  Occupied: 'orange',
};

export const cageSizeLabels: Record<CageSize, string> = {
  S: 'Nhỏ (S)',
  M: 'Vừa (M)',
  L: 'Lớn (L)',
  XL: 'Rất lớn (XL)',
};

export const cageIsolationLabels: Record<string, string> = {
  true: 'Có cách ly',
  false: 'Không cách ly',
};

/** Nhãn chuồng: chuỗi không rỗng sau khi trim */
export const validateCageLabel = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return 'Nhãn chuồng là bắt buộc và không được để trống';
  }
  const label = typeof value === 'string' ? value.trim() : '';
  if (!label) {
    return 'Nhãn chuồng là bắt buộc và không được để trống';
  }
  return undefined;
};

/** Kích thước chuồng: bắt buộc, một trong S, M, L, XL */
export const validateCageSize = (value: unknown): string | undefined => {
  if (!value) {
    return 'Kích thước chuồng là bắt buộc';
  }
  if (!CAGE_SIZES.includes(value as CageSize)) {
    return 'Kích thước chuồng phải là một trong: S, M, L, XL';
  }
  return undefined;
};

/** Trạng thái cách ly: boolean thật (true / false) nếu được cung cấp */
export const validateCageIsolation = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    return 'Trạng thái cách ly phải là true hoặc false';
  }
  return undefined;
};

/** Trạng thái chuồng: một trong Available, Occupied nếu được cung cấp */
export const validateCageStatus = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (!CAGE_STATUSES.includes(value as CageStatus)) {
    return 'Trạng thái chuồng phải là một trong: Available, Occupied';
  }
  return undefined;
};

/** Kiểm tra toàn bộ form tạo mới chuồng */
export const validateCageCreateForm = (
  values: CageFormValues
): CageFieldErrors => {
  const errors: CageFieldErrors = {};

  const labelError = validateCageLabel(values.label);
  if (labelError) errors.label = labelError;

  const sizeError = validateCageSize(values.size);
  if (sizeError) errors.size = sizeError;

  const isolationError = validateCageIsolation(values.isIsolated);
  if (isolationError) errors.isIsolated = isolationError;

  const statusError = validateCageStatus(values.status);
  if (statusError) errors.status = statusError;

  return errors;
};

/** Kiểm tra toàn bộ form cập nhật chuồng */
export const validateCageUpdateForm = (
  values: CageFormValues
): CageFieldErrors => {
  const errors: CageFieldErrors = {};

  const hasAnyField =
    values.label !== undefined ||
    values.size !== undefined ||
    values.isIsolated !== undefined ||
    values.status !== undefined;

  if (!hasAnyField) {
    errors._form = 'Cần cung cấp ít nhất một trường để cập nhật';
    return errors;
  }

  if (values.label !== undefined) {
    const labelError = validateCageLabel(values.label);
    if (labelError) errors.label = labelError;
  }

  if (values.size !== undefined) {
    const sizeError = validateCageSize(values.size);
    if (sizeError) errors.size = sizeError;
  }

  if (values.isIsolated !== undefined) {
    const isolationError = validateCageIsolation(values.isIsolated);
    if (isolationError) errors.isIsolated = isolationError;
  }

  if (values.status !== undefined) {
    const statusError = validateCageStatus(values.status);
    if (statusError) errors.status = statusError;
  }

  return errors;
};

/** Tạo query parameters hợp lệ cho API GET /api/cages */
export const buildCageQuery = (
  filters?: CageListParams
): Record<string, string | number> => {
  if (!filters) return {};
  const query: Record<string, string | number> = {};

  if (filters.status && CAGE_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.size && CAGE_SIZES.includes(filters.size)) {
    query.size = filters.size;
  }

  if (typeof filters.isIsolated === 'boolean') {
    query.isIsolated = filters.isIsolated ? 'true' : 'false';
  }

  if (typeof filters.page === 'number' && filters.page > 0) {
    query.page = Math.floor(filters.page);
  }

  if (
    typeof filters.limit === 'number' &&
    filters.limit >= 1 &&
    filters.limit <= 100
  ) {
    query.limit = Math.floor(filters.limit);
  }

  if (filters.sort && CAGE_SORTS.includes(filters.sort)) {
    query.sort = filters.sort;
  }

  return query;
};

/** Tạo payload chuẩn cho POST /api/cages (whitelisted) */
export const buildCageCreatePayload = (
  values: CageFormValues
): CageCreatePayload => {
  const payload: CageCreatePayload = {
    label: (values.label || '').trim(),
    size: values.size as CageSize,
    isIsolated: Boolean(values.isIsolated),
    status: values.status || 'Available',
  };
  return payload;
};

/** Tạo payload chuẩn cho PATCH /api/cages/:id (whitelisted) */
export const buildCageUpdatePayload = (
  values: CageFormValues
): CageUpdatePayload => {
  const payload: CageUpdatePayload = {};

  if (values.label !== undefined) {
    payload.label = values.label.trim();
  }

  if (values.size !== undefined && CAGE_SIZES.includes(values.size)) {
    payload.size = values.size;
  }

  if (typeof values.isIsolated === 'boolean') {
    payload.isIsolated = values.isIsolated;
  }

  if (values.status !== undefined && CAGE_STATUSES.includes(values.status)) {
    payload.status = values.status;
  }

  return payload;
};

/** Bóc tách thông tin lỗi từ response BE */
export const extractApiError = (
  error: unknown
): {
  status?: number;
  message: string;
  fieldErrors: Record<string, string>;
  errors: string[];
} => {
  const fieldErrors: Record<string, string> = {};
  const errors: string[] = [];

  const maybeAxios = error as
    | {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            errors?: string[];
          };
        };
        message?: string;
      }
    | undefined;

  const status = maybeAxios?.response?.status;
  const resData = maybeAxios?.response?.data;

  let message =
    resData?.message ||
    resData?.error ||
    maybeAxios?.message ||
    'Đã xảy ra lỗi khi thực hiện thao tác';

  if (Array.isArray(resData?.errors)) {
    for (const err of resData.errors) {
      if (typeof err === 'string') {
        errors.push(err);
        if (err.includes('Nhãn chuồng')) {
          fieldErrors.label = err;
        } else if (err.includes('Kích thước chuồng')) {
          fieldErrors.size = err;
        } else if (err.includes('cách ly')) {
          fieldErrors.isIsolated = err;
        } else if (err.includes('Trạng thái chuồng')) {
          fieldErrors.status = err;
        }
      }
    }
  }

  if (status === 409 || message.includes('đã tồn tại')) {
    message = 'Nhãn chuồng đã tồn tại';
    fieldErrors.label = message;
  } else if (status === 403) {
    message = 'Bạn không có quyền thực hiện chức năng này';
  } else if (status === 404) {
    message = 'Không tìm thấy chuồng';
  } else if (status && status >= 500) {
    message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
  }

  return {
    status,
    message,
    fieldErrors,
    errors,
  };
};
