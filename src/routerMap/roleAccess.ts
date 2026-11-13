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
// and where RoleRoute sends a role that opens a page it may not use. Admin works
// on account management until the analytics dashboard (SCR-28) exists.
const LANDING: Record<RoleGroup, Landing> = {
  owner: { path: ROUTER.DASHBOARD, label: 'Bảng điều khiển' },
  admin: { path: ROUTER.ADMIN_USERS, label: 'Trang quản trị' },
  staff: { path: ROUTER.PROFILE, label: 'Trang cá nhân' },
};

// Clinic roles start on their own working page: the reception page
// (SCR-16, SCR-18) and the work queue of veterinarians and groomers
// (SCR-22, SCR-26)
const ROLE_LANDING: Record<string, Landing> = {
  Receptionist: {
    path: ROUTER.CLINIC_APPOINTMENTS,
    label: 'Tiếp nhận lịch hẹn',
  },
  Veterinarian: { path: ROUTER.STAFF_QUEUE, label: 'Hàng đợi khám' },
  Groomer: { path: ROUTER.STAFF_QUEUE, label: 'Hàng đợi spa' },
};

const getLanding = (role?: string): Landing =>
  ROLE_LANDING[normalizeRole(role)] || LANDING[getRoleGroup(role)];

export const getLandingPath = (role?: string): string => getLanding(role).path;

export const getLandingLabel = (role?: string): string =>
  getLanding(role).label;

// Only Admin, Receptionist and Veterinarian go straight to their working page
// after login; pet owners, groomers and any other role start on the home page
const WORK_PAGE_AFTER_LOGIN = new Set([
  'Admin',
  'Receptionist',
  'Veterinarian',
]);

export const getPostLoginPath = (role?: string): string =>
  WORK_PAGE_AFTER_LOGIN.has(normalizeRole(role))
    ? getLandingPath(role)
    : ROUTER.HOME;

/**
 * Where "Đặt lịch khám" leads a signed-in user: pet owners book online from their
 * dashboard and the receptionist books at the desk (walk-in form). Admin, vets and
 * groomers do not book (POST /appointment-services/online-booking is PetOwner only).
 */
export const getBookingPath = (role?: string): string | undefined => {
  if (normalizeRole(role) === 'Receptionist') {
    return `${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`;
  }
  if (getRoleGroup(role) === 'owner') {
    return `${ROUTER.DASHBOARD}?tab=appointments&book=new`;
  }
  return undefined;
};
