import React from 'react';
import {
  DashboardOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  BuildOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

import ROUTER from './ROUTER';
import { getRoleGroup, normalizeRole } from '@/constants/roles';

export interface MenuItem {
  key: string;
  label: any;
  icon?: React.ReactNode;
  children?: MenuItem[];
  [key: string]: any;
}

export const ListTitleRouter = () => {
  return [
    {
      key: ROUTER.PROFILE,
      label: 'Thông tin cá nhân',
    },
    {
      key: ROUTER.DASHBOARD,
      label: 'Bảng điều khiển',
    },
    {
      key: ROUTER.CAGES,
      label: 'Quản lý chuồng',
    },
    {
      key: ROUTER.CLINIC_APPOINTMENTS,
      label: 'Tiếp nhận lịch hẹn',
    },
  ];
};

export const MenuItemBreadcrumbs = () => {
  return [
    {
      label: 'Trang chủ',
      key: ROUTER.HOME,
    },
    {
      label: 'Bảng điều khiển',
      key: ROUTER.DASHBOARD,
    },
    {
      label: 'Thông tin cá nhân',
      key: ROUTER.PROFILE,
    },
    {
      label: 'Quản lý tài khoản',
      key: ROUTER.ADMIN_USERS,
    },
    {
      label: 'Quản lý dịch vụ',
      key: ROUTER.ADMIN_SERVICES,
    },
    {
      label: 'Quản lý sản phẩm',
      key: ROUTER.ADMIN_PRODUCTS,
    },
    {
      label: 'Quản lý chuồng',
      key: ROUTER.CAGES,
    },
    {
      label: 'Tiếp nhận lịch hẹn',
      key: ROUTER.CLINIC_APPOINTMENTS,
    },
  ];
};

export const MenuItemCommon = (): MenuItem[] => {
  return [
    {
      key: ROUTER.HOME,
      label: 'Trang chủ',
      icon: <HomeOutlined />,
    },
    {
      key: ROUTER.DASHBOARD,
      label: 'Bảng điều khiển',
      icon: <DashboardOutlined />,
    },
    {
      key: ROUTER.PROFILE,
      label: 'Thông tin tài khoản',
      icon: <UserOutlined />,
    },
  ];
};

// Clinic staff and Admin own no pets, so they get no pet-owner dashboard (SCR-07)
export const MenuItemStaff = (): MenuItem[] => {
  return [
    {
      key: ROUTER.HOME,
      label: 'Trang chủ',
      icon: <HomeOutlined />,
    },
    {
      key: ROUTER.PROFILE,
      label: 'Thông tin tài khoản',
      icon: <UserOutlined />,
    },
  ];
};

// Receptionist can access Appointments and Cages in addition to common staff items
export const MenuItemReceptionist = (): MenuItem[] => {
  return [
    ...MenuItemStaff(),
    {
      key: ROUTER.CLINIC_APPOINTMENTS,
      label: 'Tiếp nhận lịch hẹn',
      icon: <ScheduleOutlined />,
    },
    {
      key: ROUTER.CAGES,
      label: 'Quản lý chuồng',
      icon: <BuildOutlined />,
    },
  ];
};

export const MenuItemAdmin = (): MenuItem[] => {
  return [
    ...MenuItemStaff(),
    {
      key: ROUTER.ADMIN_USERS,
      label: 'Quản lý tài khoản',
      icon: <TeamOutlined />,
    },
    {
      key: ROUTER.ADMIN_SERVICES,
      label: 'Quản lý dịch vụ',
      icon: <AppstoreOutlined />,
    },
    {
      key: ROUTER.ADMIN_PRODUCTS,
      label: 'Quản lý sản phẩm',
      icon: <ShoppingOutlined />,
    },
    {
      key: ROUTER.CLINIC_APPOINTMENTS,
      label: 'Tiếp nhận lịch hẹn',
      icon: <ScheduleOutlined />,
    },
    {
      key: ROUTER.CAGES,
      label: 'Quản lý chuồng',
      icon: <BuildOutlined />,
    },
  ];
};

/** Hàm helper: Lấy menu theo role */
export const getMenuByRole = (role?: string): MenuItem[] => {
  const normRole = normalizeRole(role);
  if (normRole === 'Admin') return MenuItemAdmin();
  if (normRole === 'Receptionist') return MenuItemReceptionist();
  const group = getRoleGroup(role);
  if (group === 'staff') return MenuItemStaff();
  return MenuItemCommon();
};

export const MenuItemUser = () => MenuItemCommon();

const MenuItemDefault = () => MenuItemCommon();

export default MenuItemDefault;
