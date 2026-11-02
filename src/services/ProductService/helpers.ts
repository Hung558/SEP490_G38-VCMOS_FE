import type {
  ProductCategory,
  ProductCreatePayload,
  ProductFieldErrors,
  ProductFilters,
  ProductFormValues,
  ProductStatus,
  ProductUpdatePayload,
} from './types';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Medicine',
  'Vaccine',
  'Retail',
];

export const PRODUCT_STATUSES: ProductStatus[] = ['Active', 'Inactive'];

export const PRODUCT_NAME_MAX = 200;
export const PRODUCT_UNIT_MAX = 50;
export const PRODUCT_SEARCH_MAX = 100;

export const productCategoryLabels: Record<ProductCategory, string> = {
  Medicine: 'Thuốc điều trị',
  Vaccine: 'Vắc xin',
  Retail: 'Bán lẻ / Phụ kiện',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  Active: 'Đang kinh doanh',
  Inactive: 'Ngừng kinh doanh',
};

/** Tên sản phẩm: chuỗi không rỗng, tối đa 200 ký tự sau khi trim. */
export const validateProductName = (value: unknown): string | undefined => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'Tên sản phẩm là bắt buộc và phải là chuỗi không rỗng';
  if (name.length > PRODUCT_NAME_MAX) {
    return `Tên sản phẩm không được vượt quá ${PRODUCT_NAME_MAX} ký tự`;
  }
  return undefined;
};

/** Danh mục sản phẩm: bắt buộc, một trong Medicine, Vaccine, Retail. */
export const validateProductCategory = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) {
    return 'Loại sản phẩm là bắt buộc';
  }
  if (!PRODUCT_CATEGORIES.includes(value as ProductCategory)) {
    return 'Loại sản phẩm phải là một trong: Medicine, Vaccine, Retail';
  }
  return undefined;
};

/** Đơn vị tính: bắt buộc, chuỗi không rỗng, tối đa 50 ký tự. */
export const validateProductUnit = (value: unknown): string | undefined => {
  const unit = typeof value === 'string' ? value.trim() : '';
  if (!unit) return 'Đơn vị tính là bắt buộc và phải là chuỗi không rỗng';
  if (unit.length > PRODUCT_UNIT_MAX) {
    return `Đơn vị tính không được vượt quá ${PRODUCT_UNIT_MAX} ký tự`;
  }
  return undefined;
};

/** Đơn giá: không bắt buộc, nếu có phải là số không âm. */
export const validateProductUnitPrice = (
  value: unknown
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    return 'Đơn giá phải là số không âm';
  }
  return undefined;
};

/** Kiểm tra toàn bộ form sản phẩm. */
export const validateProductForm = (
  values: ProductFormValues
): ProductFieldErrors => {
  const errors: ProductFieldErrors = {};

  const nameError = validateProductName(values.name);
  if (nameError) errors.name = nameError;

  const categoryError = validateProductCategory(values.category);
  if (categoryError) errors.category = categoryError;

  const unitError = validateProductUnit(values.unit);
  if (unitError) errors.unit = unitError;

  const priceError = validateProductUnitPrice(values.unitPrice);
  if (priceError) errors.unitPrice = priceError;

  return errors;
};

/** Tạo payload chuẩn cho API POST /api/products */
export const buildProductPayload = (
  values: ProductFormValues
): ProductCreatePayload => {
  const payload: ProductCreatePayload = {
    name: values.name?.trim() || '',
    category: values.category as ProductCategory,
    unit: values.unit?.trim() || '',
  };

  if (
    values.unitPrice !== undefined &&
    values.unitPrice !== null &&
    values.unitPrice !== ('' as unknown)
  ) {
    payload.unitPrice = Number(values.unitPrice);
  }

  return payload;
};

/** Tạo payload chuẩn cho API PUT /api/products/:id */
export const buildProductUpdatePayload = (
  values: ProductFormValues
): ProductUpdatePayload => {
  const payload: ProductUpdatePayload = {};

  if (typeof values.name === 'string') {
    payload.name = values.name.trim();
  }
  if (values.category && PRODUCT_CATEGORIES.includes(values.category)) {
    payload.category = values.category;
  }
  if (typeof values.unit === 'string') {
    payload.unit = values.unit.trim();
  }
  if (
    values.unitPrice !== undefined &&
    values.unitPrice !== null &&
    values.unitPrice !== ('' as unknown)
  ) {
    payload.unitPrice = Number(values.unitPrice);
  }

  return payload;
};

/** Tạo query parameters cho API GET /api/products */
export const buildProductQuery = (
  filters?: ProductFilters
): Record<string, string | number> => {
  if (!filters) return {};
  const query: Record<string, string | number> = {};

  const search = filters.search?.trim();
  if (search) {
    query.search = search.slice(0, PRODUCT_SEARCH_MAX);
  }
  if (filters.category && PRODUCT_CATEGORIES.includes(filters.category)) {
    query.category = filters.category;
  }
  if (filters.status && PRODUCT_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  }
  if (typeof filters.page === 'number' && filters.page > 0) {
    query.page = Math.floor(filters.page);
  }
  if (typeof filters.limit === 'number' && filters.limit > 0) {
    query.limit = Math.floor(filters.limit);
  }

  return query;
};

/** Định dạng đơn giá hiển thị dạng tiền tệ Việt Nam. */
export const formatProductPrice = (value?: number): string => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toLocaleString('vi-VN')} đ`;
};

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
  };
  message?: string;
}

/** Trích xuất thông báo lỗi và lỗi từng trường từ response của backend. */
export const extractApiError = (
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra'
): { message: string; fieldErrors: Record<string, string> } => {
  const candidate = error as ApiErrorShape | undefined;
  const data = candidate?.response?.data;
  const message = data?.message || candidate?.message || fallbackMessage;
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      if (item?.field && item?.message) {
        fieldErrors[item.field] = item.message;
      }
    }
  }

  return { message, fieldErrors };
};
