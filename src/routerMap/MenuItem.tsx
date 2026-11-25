import React from 'react';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  BuildOutlined,
  ScheduleOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  BarChartOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  HistoryOutlined,
  CommentOutlined,
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
      label: 'Thông tin tài khoản',
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
      key: ROUTER.FRONT_DESK_DASHBOARD,
      label: 'Tổng quan lễ tân',
      icon: <DashboardOutlined />,
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
      label: 'Thông tin tài khoản',
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
      label: 'Tổng quan quản trị',
      key: ROUTER.ADMIN_REPORTS,
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

// No "Trang chủ" item in any sidebar (24/11): the dashboard header button and
// "Trở về Trang chủ" under the sidebar already lead home.
// 26/11: "Hành trình của bé" is its own page again, no longer a dashboard tab.
export const MenuItemCommon = (): MenuItem[] => {
  return [
    {
      key: ROUTER.DASHBOARD,
      label: 'Bảng điều khiển',
      icon: <DashboardOutlined />,
    },
    {
      key: ROUTER.PET_JOURNEYS,
      label: 'Hành trình của bé',
      icon: <HistoryOutlined />,
    },
    {
      key: ROUTER.AI_ASSESSMENT,
      label: 'Tính năng AI',
      icon: <RobotOutlined />,
    },
    {
      key: ROUTER.MY_INVOICES,
      label: 'Hóa đơn',
      icon: <DollarOutlined />,
    },
    {
      key: ROUTER.COMMUNITY,
      label: 'Cộng đồng',
      icon: <CommentOutlined />,
    },
    {
      key: ROUTER.MY_COMMUNITY_POSTS,
      icon: <EditOutlined />,
      label: 'Bài viết của tôi',
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
      key: ROUTER.COMMUNITY,
      label: 'Cộng đồng',
      icon: <CommentOutlined />,
    },
    {
      key: ROUTER.FRONT_DESK_DASHBOARD,
      label: 'Tổng quan lễ tân',
      icon: <DashboardOutlined />,
    },
    {
      key: ROUTER.CLINIC_APPOINTMENTS,
      label: 'Tiếp nhận lịch hẹn',
      icon: <ScheduleOutlined />,
    },
    {
      key: ROUTER.CLINIC_INVOICES,
      label: 'Hóa đơn',
      icon: <DollarOutlined />,
    },
    {
      key: ROUTER.CAGES,
      label: 'Sơ đồ chuồng',
      icon: <BuildOutlined />,
    },
    {
      key: ROUTER.STAFF_SCHEDULES,
      label: 'Ca làm việc',
      icon: <CalendarOutlined />,
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
      key: ROUTER.ADMIN_REPORTS,
      label: 'Tổng quan quản trị',
      icon: <BarChartOutlined />,
    },
    {
      key: ROUTER.ADMIN_COMMUNITY_MODERATION,
      label: 'Kiểm duyệt cộng đồng',
      icon: <SafetyCertificateOutlined />,
    },
    {
      key: ROUTER.STAFF_SCHEDULES,
      label: 'Ca làm việc',
      icon: <CalendarOutlined />,
    },
    // No "Tổng quan lễ tân": its figures are the "Quầy lễ tân" tab of
    // "Tổng quan quản trị" (24/11)
    {
      key: ROUTER.CLINIC_APPOINTMENTS,
      label: 'Tiếp nhận lịch hẹn',
      icon: <ScheduleOutlined />,
    },
    {
      key: ROUTER.CLINIC_INVOICES,
      label: 'Hóa đơn',
      icon: <DollarOutlined />,
    },
    {
      key: ROUTER.CAGES,
      label: 'Quản lý chuồng',
      icon: <BuildOutlined />,
    },
  ];
};

/** Hàm helper: Lấy menu theo role */
// Veterinarian and Groomer work from their queue (SCR-22, SCR-26) and can check cages (BR-10, UC-27)
export const MenuItemClinicalStaff = (role: string): MenuItem[] => {
  return [
    ...MenuItemStaff(),
    {
      key: ROUTER.STAFF_QUEUE,
      label: role === 'Groomer' ? 'Hàng đợi spa' : 'Hàng đợi khám',
      icon: <UnorderedListOutlined />,
    },
    ...(role === 'Veterinarian'
      ? [
          {
            key: ROUTER.INPATIENT_CARE,
            label: 'Nội trú',
            icon: <MedicineBoxOutlined />,
          },
        ]
      : []),
    {
      key: ROUTER.STAFF_SCHEDULES,
      label: 'Lịch làm việc của tôi',
      icon: <CalendarOutlined />,
    },
    {
      key: ROUTER.CAGES,
      label: 'Sơ đồ chuồng',
      icon: <BuildOutlined />,
    },
  ];
};

export const getMenuByRole = (role?: string): MenuItem[] => {
  const normRole = normalizeRole(role);
  if (normRole === 'Admin') return MenuItemAdmin();
  if (normRole === 'Receptionist') return MenuItemReceptionist();
  if (normRole === 'Veterinarian' || normRole === 'Groomer') {
    return MenuItemClinicalStaff(normRole);
  }
  const group = getRoleGroup(role);
  if (group === 'staff') return MenuItemStaff();
  return MenuItemCommon();
};

export const MenuItemUser = () => MenuItemCommon();

const MenuItemDefault = () => MenuItemCommon();

export default MenuItemDefault;
