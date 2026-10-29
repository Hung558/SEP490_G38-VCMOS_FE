import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import {
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Avatar, Menu } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const StyleMenuAccount = styled.div`
  .menu-account {
    padding: 6px;
    border-radius: 16px;
    min-width: 220px;

    .btn-logout {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 10px;
      font-size: 14px !important;
      font-weight: 600;
      color: #ef4444;
      cursor: pointer;
    }

    .btn-function {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 10px;
      font-size: 14px !important;
      color: #334155;
      text-decoration: none;
      padding: 4px 0;

      &:hover {
        color: #0d9488;
      }
    }

    .account-infor {
      padding: 8px 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 12px;

      .account-infor-sumary {
        display: flex;
        flex-direction: column;

        .account-infor-sumary-fullname {
          font-weight: 700;
          color: #0f172a;
          font-size: 14px;
        }

        .account-infor-sumary-position {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }
`;

const MenuUser = () => {
  const { isLogin, setIsLogin } = useIsLogin();
  const { user, setUser } = useAuth();
  const [activeKey, setActiveKey] = useState<string>('');

  const { pathname } = window.location;

  useEffect(() => {
    setActiveKey(pathname);
  }, [pathname]);

  const handleLogout = async () => {
    if (isLogin) {
      storage.clearLocalStorage();
      setIsLogin('');
      setUser(null);
      window.location.href = '/';
    }
  };

  const commonItems: MenuProps['items'] = [
    {
      type: 'group',
      label: (
        <div className="account-infor">
          <Avatar
            size={36}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#0d9488' }}
          />
          <div className="account-infor-sumary">
            <div className="account-infor-sumary-fullname">
              {user?.fullName || 'Người dùng'}
            </div>
            <div className="account-infor-sumary-position">
              {user?.email || user?.phone || user?.username || 'Thành viên'}
            </div>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: ROUTER.DASHBOARD,
      label: (
        <Link className="btn-function" to={ROUTER.DASHBOARD}>
          <DashboardOutlined style={{ fontSize: '16px' }} />
          <span>Bảng điều khiển</span>
        </Link>
      ),
    },
    {
      key: ROUTER.PROFILE,
      label: (
        <Link className="btn-function" to={ROUTER.PROFILE}>
          <UserOutlined style={{ fontSize: '16px' }} />
          <span>Thông tin cá nhân</span>
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: (
        <div className="btn-logout" onClick={handleLogout}>
          <LogoutOutlined style={{ fontSize: '16px' }} />
          <span>Đăng xuất</span>
        </div>
      ),
    },
  ];

  return (
    <StyleMenuAccount>
      <Menu
        selectedKeys={[activeKey]}
        className="menu-account"
        items={commonItems}
      />
    </StyleMenuAccount>
  );
};

export default MenuUser;
