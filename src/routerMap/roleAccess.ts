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

// Each role's home page after login. Admin starts on account management until
// the analytics dashboard (SCR-28) exists: change it here.
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
