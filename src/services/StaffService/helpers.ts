import type {
  ClinicalStaffRole,
  ListStaffParams,
  StaffAccountStatus,
  StaffMember,
} from '../../types/api/staff.api';

export const CLINICAL_STAFF_ROLES: readonly ClinicalStaffRole[] = [
  'Veterinarian',
  'Groomer',
];

const STAFF_STATUSES: readonly StaffAccountStatus[] = [
  'Active',
  'Inactive',
  'Locked',
];

/**
 * Vai trò được nhận một dịch vụ: Grooming cho Groomer, mọi nhóm còn lại cho Bác sĩ thú y
 * (BE kiểm tra đúng quy tắc này khi tạo walk-in)
 */
export const getRequiredStaffRole = (category?: string): ClinicalStaffRole =>
  category === 'Grooming' ? 'Groomer' : 'Veterinarian';

/** Build query params cho GET /api/users/staff, chỉ giữ các key và giá trị BE chấp nhận */
export const buildStaffQuery = (
  params?: ListStaffParams
): Record<string, string | number> => {
  if (!params) return {};
  const query: Record<string, string | number> = {};

  if (params.role && CLINICAL_STAFF_ROLES.includes(params.role)) {
    query.role = params.role;
  }
  if (params.status && STAFF_STATUSES.includes(params.status)) {
    query.status = params.status;
  }
  const search = typeof params.search === 'string' ? params.search.trim() : '';
  if (search) {
    query.search = search;
  }
  if (
    typeof params.page === 'number' &&
    Number.isInteger(params.page) &&
    params.page >= 1
  ) {
    query.page = params.page;
  }
  if (
    typeof params.limit === 'number' &&
    Number.isInteger(params.limit) &&
    params.limit >= 1 &&
    params.limit <= 100
  ) {
    query.limit = params.limit;
  }

  return query;
};

/** Nhân sự đang hoạt động thuộc đúng vai trò, dùng cho ô chọn người phụ trách */
export const getAssignableStaff = (
  staff: StaffMember[] | null | undefined,
  role: ClinicalStaffRole
): StaffMember[] =>
  Array.isArray(staff)
    ? staff.filter(s => s && s.role === role && s.status === 'Active')
    : [];

export const formatStaffOption = (
  staff: Pick<StaffMember, 'fullName' | 'code'>
): string =>
  staff.code ? `${staff.fullName} (${staff.code})` : staff.fullName;
