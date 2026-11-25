// Relative .ts imports (no @/ alias) so node:test can load this file directly
import ROUTER from './ROUTER.ts';
import {
  getRoleGroup,
  normalizeRole,
  type RoleGroup,
} from '../constants/roles.ts';

interface Landing {
  path: string;
  label: string;
}

// Each role's working page: the landing link in the home header and user menu,
// and where RoleRoute sends a role that opens a page it may not use.
const LANDING: Record<RoleGroup, Landing> = {
  owner: { path: ROUTER.DASHBOARD, label: 'Bảng điều khiển' },
  admin: { path: ROUTER.ADMIN_REPORTS, label: 'Tổng quan quản trị' },
  staff: { path: ROUTER.PROFILE, label: 'Thông tin tài khoản' },
};

// Clinic roles start on their own working page: the reception page
// (SCR-16, SCR-18) and the work queue of veterinarians and groomers
// (SCR-22, SCR-26)
const ROLE_LANDING: Record<string, Landing> = {
  Receptionist: {
    path: ROUTER.FRONT_DESK_DASHBOARD,
    label: 'Tổng quan lễ tân',
  },
  Veterinarian: { path: ROUTER.STAFF_QUEUE, label: 'Hàng đợi khám' },
  Groomer: { path: ROUTER.STAFF_QUEUE, label: 'Hàng đợi spa' },
};

const getLanding = (role?: string): Landing =>
  ROLE_LANDING[normalizeRole(role)] || LANDING[getRoleGroup(role)];

export const getLandingPath = (role?: string): string => getLanding(role).path;

export const getLandingLabel = (role?: string): string =>
  getLanding(role).label;

// Every authenticated role starts in its own workspace, never the guest homepage.
export const getPostLoginPath = (role?: string): string => getLandingPath(role);

/**
 * Where "Đặt lịch khám" leads a signed-in user: pet owners book online from their
 * dashboard and the receptionist books at the desk (walk-in form). Admin, vets and
 * groomers do not book (POST /appointment-services/online-booking is PetOwner only).
 * serviceId ("Đặt dịch vụ này" on a home service card) is pre-selected in the
 * owner's booking form.
 */
export const getBookingPath = (
  role?: string,
  serviceId?: string
): string | undefined => {
  if (normalizeRole(role) === 'Receptionist') {
    return `${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`;
  }
  if (getRoleGroup(role) === 'owner') {
    const params = new URLSearchParams({ tab: 'appointments', book: 'new' });
    if (serviceId) params.set('service', serviceId);
    return `${ROUTER.DASHBOARD}?${params.toString()}`;
  }
  return undefined;
};
