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

// The screens each clinic role works in (SRS actors).
// Case-specific work opens the queue first so staff choose an authorized case.
export interface StaffScreen {
  code: string;
  name: string;
  path: string;
}

export const STAFF_ROLE_CONTENT: Record<string, { screens: StaffScreen[] }> = {
  Receptionist: {
    screens: [
      {
        code: 'SCR-16',
        name: 'Bảng điều khiển lễ tân',
        path: ROUTER.FRONT_DESK_DASHBOARD,
      },
      {
        code: 'SCR-17',
        name: 'Lịch chung của phòng khám',
        path: `${ROUTER.CLINIC_APPOINTMENTS}?tab=schedule`,
      },
      {
        code: 'SCR-18',
        name: 'Tiếp nhận khách vãng lai',
        path: `${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`,
      },
      { code: 'SCR-19', name: 'Sơ đồ chuồng', path: ROUTER.CAGES },
      {
        code: 'SCR-20',
        name: 'Thu ngân và thanh toán',
        path: ROUTER.CLINIC_INVOICES,
      },
      {
        code: 'SCR-21',
        name: 'Danh bạ khách hàng và thú cưng',
        path: `${ROUTER.CLINIC_APPOINTMENTS}?tab=lookup`,
      },
    ],
  },
  Veterinarian: {
    screens: [
      {
        code: 'SCR-22',
        name: 'Lịch làm việc và hàng đợi khám',
        path: ROUTER.STAFF_QUEUE,
      },
      // A SOAP record is opened from a case in the queue
      { code: 'SCR-23', name: 'Bệnh án SOAP', path: ROUTER.STAFF_QUEUE },
      {
        code: 'SCR-24',
        name: 'Chỉ định và kết quả cận lâm sàng',
        path: ROUTER.STAFF_QUEUE,
      },
      {
        code: 'SCR-25',
        name: 'Khu nội trú và nhật ký hằng ngày',
        path: ROUTER.INPATIENT_CARE,
      },
    ],
  },
  Groomer: {
    screens: [
      {
        code: 'SCR-26',
        name: 'Lịch làm việc và hàng đợi spa',
        path: ROUTER.STAFF_QUEUE,
      },
      {
        code: 'SCR-27',
        name: 'Thực hiện grooming và ghi chú chăm sóc',
        path: ROUTER.STAFF_QUEUE,
      },
      {
        code: 'SCR-24',
        name: 'Dịch vụ phụ được giao (ví dụ tắm thuốc)',
        path: ROUTER.STAFF_QUEUE,
      },
    ],
  },
};

export const getStaffRoleContent = (role?: string) =>
  STAFF_ROLE_CONTENT[normalizeRole(role)] || null;
