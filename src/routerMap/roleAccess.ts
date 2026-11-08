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

// Each role's home page after login. Veterinarians and groomers use their
// profile page until their queues (SCR-22, SCR-26) exist, and Admin starts on
// account management until the analytics dashboard (SCR-28) exists: change
// them here.
const LANDING: Record<RoleGroup, Landing> = {
  owner: { path: ROUTER.DASHBOARD, label: 'Bảng điều khiển' },
  admin: { path: ROUTER.ADMIN_USERS, label: 'Trang quản trị' },
  staff: { path: ROUTER.PROFILE, label: 'Trang cá nhân' },
};

// Roles whose own page already exists. The reception page holds the
// receptionist's appointment list, check-in, walk-in and staff assignment
// (SCR-16, SCR-18).
const ROLE_LANDING: Record<string, Landing> = {
  Receptionist: {
    path: ROUTER.CLINIC_APPOINTMENTS,
    label: 'Tiếp nhận lịch hẹn',
  },
};

const getLanding = (role?: string): Landing =>
  ROLE_LANDING[normalizeRole(role)] || LANDING[getRoleGroup(role)];

export const getLandingPath = (role?: string): string => getLanding(role).path;

export const getLandingLabel = (role?: string): string =>
  getLanding(role).label;
