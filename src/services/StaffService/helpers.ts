import type {
  ClinicalStaffRole,
  ListStaffParams,
  StaffAccountStatus,
  StaffMember,
  StaffShift,
} from '../../types/api/staff.api';

export const STAFF_SHIFTS: readonly StaffShift[] = [
  'MORNING',
  'AFTERNOON',
  'EVENING',
];

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

/**
 * Vai trò thực hiện một dịch vụ trong danh mục, đúng như BE (`resolveServiceRequiredRole`,
 * từ f19060f): `requiredRole` nếu Admin đã đặt, không thì theo nhóm dịch vụ
 */
export const getServiceStaffRole = (service: {
  category?: string;
  requiredRole?: string | null;
}): ClinicalStaffRole =>
  service.requiredRole === 'Veterinarian' || service.requiredRole === 'Groomer'
    ? service.requiredRole
    : getRequiredStaffRole(service.category);

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
  const workDate =
    typeof params.workDate === 'string' ? params.workDate.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    query.workDate = workDate;
  }
  const date = typeof params.date === 'string' ? params.date.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    query.date = date;
  }
  const time = typeof params.time === 'string' ? params.time.trim() : '';
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    query.time = time;
  }
  if (params.shift && STAFF_SHIFTS.includes(params.shift)) {
    query.shift = params.shift;
  }
  const serviceId =
    typeof params.serviceId === 'string' ? params.serviceId.trim() : '';
  if (/^[0-9a-fA-F]{24}$/.test(serviceId)) {
    query.serviceId = serviceId;
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

/**
 * Người có thể phân công cho một vai trò vào một ngày: ưu tiên người có lịch làm việc
 * ngày đó ("không vướng lịch"). Nếu vai trò đó chưa ai có lịch (BE chưa có API xếp lịch),
 * lùi về mọi người đang hoạt động và trả `onDutyOnly: false` để UI báo cho lễ tân.
 */
export const pickAssignableStaff = (
  onDuty: StaffMember[] | null | undefined,
  all: StaffMember[] | null | undefined,
  role: ClinicalStaffRole
): { staff: StaffMember[]; onDutyOnly: boolean } => {
  const scheduled = getAssignableStaff(onDuty, role);
  if (scheduled.length > 0) return { staff: scheduled, onDutyOnly: true };
  return { staff: getAssignableStaff(all, role), onDutyOnly: false };
};

export const formatStaffOption = (
  staff: Pick<StaffMember, 'fullName' | 'code'>
): string =>
  staff.code ? `${staff.fullName} (${staff.code})` : staff.fullName;
