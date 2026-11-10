// Role-specific text of the profile page. Relative .ts import (no @/ alias) so
// node:test can load this file directly.
import ROUTER from '../../../routerMap/ROUTER.ts';
import {
  getRoleGroup,
  getRoleLabel,
  normalizeRole,
} from '../../../constants/roles.ts';

export const getProfileSubtitle = (role?: string): string => {
  const group = getRoleGroup(role);
  if (group === 'admin') return 'Hồ sơ quản trị viên';
  if (group === 'staff') return `Hồ sơ nhân viên · ${getRoleLabel(role)}`;
  return 'Hồ sơ chủ nuôi';
};

const ACCOUNT_STATUS: Record<string, { label: string; color: string }> = {
  Active: { label: 'Hoạt động', color: 'green' },
  Inactive: { label: 'Chưa kích hoạt', color: 'default' },
  Locked: { label: 'Đã khóa', color: 'red' },
};

export const getAccountStatus = (status?: string) =>
  ACCOUNT_STATUS[status || ''] || {
    label: status || 'Chưa rõ',
    color: 'default',
  };

// What each clinic role does (SRS actors) and the screens it works in.
// `path` is set once a screen exists; the others show as in development.
export interface StaffScreen {
  code: string;
  name: string;
  path?: string;
}

export const STAFF_ROLE_CONTENT: Record<
  string,
  { description: string; screens: StaffScreen[] }
> = {
  Receptionist: {
    description:
      'Tiếp đón khách, quản lý lịch hẹn, chuồng, khách vãng lai và thu ngân.',
    screens: [
      {
        code: 'SCR-16',
        name: 'Bảng điều khiển lễ tân',
        path: ROUTER.CLINIC_APPOINTMENTS,
      },
      { code: 'SCR-17', name: 'Lịch chung của phòng khám' },
      {
        code: 'SCR-18',
        name: 'Tiếp nhận khách vãng lai',
        path: ROUTER.CLINIC_APPOINTMENTS,
      },
      { code: 'SCR-19', name: 'Sơ đồ chuồng', path: ROUTER.CAGES },
      { code: 'SCR-20', name: 'Thu ngân và thanh toán' },
      {
        code: 'SCR-21',
        name: 'Danh bạ khách hàng và thú cưng',
        path: ROUTER.CLINIC_APPOINTMENTS,
      },
    ],
  },
  Veterinarian: {
    description:
      'Khám bệnh, ghi bệnh án SOAP, kê đơn thuốc và theo dõi thú cưng nội trú.',
    screens: [
      {
        code: 'SCR-22',
        name: 'Lịch làm việc và hàng đợi khám',
        path: ROUTER.STAFF_QUEUE,
      },
      // A SOAP record is opened from a case in the queue
      { code: 'SCR-23', name: 'Bệnh án SOAP', path: ROUTER.STAFF_QUEUE },
      { code: 'SCR-24', name: 'Chỉ định và kết quả cận lâm sàng' },
      { code: 'SCR-25', name: 'Khu nội trú và nhật ký hằng ngày' },
    ],
  },
  Groomer: {
    description:
      'Thực hiện dịch vụ spa, grooming và ghi chú chăm sóc cho thú cưng.',
    screens: [
      {
        code: 'SCR-26',
        name: 'Lịch làm việc và hàng đợi spa',
        path: ROUTER.STAFF_QUEUE,
      },
      { code: 'SCR-27', name: 'Thực hiện grooming và ghi chú chăm sóc' },
      { code: 'SCR-24', name: 'Dịch vụ phụ được giao (ví dụ tắm thuốc)' },
    ],
  },
};

export const getStaffRoleContent = (role?: string) =>
  STAFF_ROLE_CONTENT[normalizeRole(role)] || null;

export interface AccountSummary {
  total: number;
  locked: number;
  byRole: Record<string, number>;
}

/** Counts accounts per role and the locked ones, for the admin overview */
export const summarizeAccounts = (
  users: { role?: string; status?: string }[]
): AccountSummary => {
  const byRole: Record<string, number> = {};
  let locked = 0;
  for (const user of users) {
    const key = normalizeRole(user.role) || user.role || 'Khác';
    byRole[key] = (byRole[key] || 0) + 1;
    if (user.status === 'Locked') locked++;
  }
  return { total: users.length, locked, byRole };
};
