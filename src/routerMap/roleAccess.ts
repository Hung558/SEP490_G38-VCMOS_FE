// Relative .ts imports (no @/ alias) so node:test can load this file directly
import ROUTER from './ROUTER.ts';
import { getRoleGroup, type RoleGroup } from '../constants/roles.ts';

// Each role's home page after login. Clinic staff use their profile page until
// their dashboards (SCR-16, SCR-22, SCR-26) exist, and Admin starts on account
// management until the analytics dashboard (SCR-28) exists: change them here.
const LANDING: Record<RoleGroup, { path: string; label: string }> = {
  owner: { path: ROUTER.DASHBOARD, label: 'Bảng điều khiển' },
  admin: { path: ROUTER.ADMIN_USERS, label: 'Trang quản trị' },
  staff: { path: ROUTER.PROFILE, label: 'Trang cá nhân' },
};

export const getLandingPath = (role?: string): string =>
  LANDING[getRoleGroup(role)].path;

export const getLandingLabel = (role?: string): string =>
  LANDING[getRoleGroup(role)].label;
