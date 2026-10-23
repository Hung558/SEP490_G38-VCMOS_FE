import React from 'react';
import {
  DashboardOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ROUTER from './ROUTER';

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

export const MenuItemAdmin = (): MenuItem[] => {
  return [
    ...MenuItemCommon(),
    {
      key: '/settings',
      label: 'Cài đặt hệ thống',
      icon: <SettingOutlined />,
    },
  ];
};

/** Hàm helper: Lấy menu theo role */
export const getMenuByRole = (role?: string): MenuItem[] => {
  if (role === 'ADMIN' || role === 'admin') {
    return MenuItemAdmin();
  }
  return MenuItemCommon();
};

export const MenuItemUser = () => MenuItemCommon();

const MenuItemDefault = () => MenuItemCommon();

export default MenuItemDefault;
