import { useAuth } from '@/contexts/routerProvider/authContext';
import { useCollapseMenu } from '@/contexts/routerProvider/collapseMenuContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { type MenuItem, getMenuByRole } from '@/routerMap/MenuItem';
import { Layout, Menu, theme, Avatar, Button } from 'antd';
import { LogoutOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';
import { PanelLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { storage } from '@/lib/storage';
import styles from './mainLayout.module.scss';
import ROUTER from '@/routerMap/ROUTER';
import Breadcrumb from '../Breadcrumb/Breadcrumb';

const LayoutLeftMenuStyle = styled(Menu)`
  background: #00195c !important;
  color: #ffffff !important;

  .ant-menu-item,
  .ant-menu-submenu-title {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.8) !important;
    border-radius: 8px !important;
    transition: all 0.15s ease-in-out;
    margin-bottom: 8px;
    height: auto !important;
    padding-top: 10px !important;
    padding-bottom: 10px !important;

    &:hover {
      background-color: #274093 !important;
      color: #ffffff !important;
      opacity: 1;
    }
  }

  .ant-menu-item-selected,
  .ant-menu-submenu-selected > .ant-menu-submenu-title {
    background-color: #112e81 !important;
    color: #849af2 !important;
    font-weight: 600;
    opacity: 1;

    a {
      font-weight: 600;
      color: inherit;
    }
    .ant-menu-title-content {
      color: inherit;
    }
  }

  .ant-menu-submenu-arrow {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  .ant-menu-inline {
    background: #00195c !important;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`;

const BrandHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;

  .logo-text {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin: 0;
    color: #ffffff;
  }

  .sub-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
`;

const { Content, Sider } = Layout;

const MainLayout = ({ ...rest }: any) => {
  const { children } = rest;
  const { collapseMenu, setCollapseMenu } = useCollapseMenu();
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState<string[]>([location.pathname]);
  const { setIsLogin } = useIsLogin();
  const { user, setUser } = useAuth();

  const handleLogout = () => {
    storage.clearLocalStorage();
    setIsLogin('');
    setUser(null);
    window.location.href = ROUTER.HOME;
  };

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const onClickMenu = (menuInfo: any) => {
    setSelectedKey(menuInfo.keyPath);
    if (!menuInfo.key.includes('subkey')) navigate(menuInfo.key);
  };

  useEffect(() => {
    const roleMenu = getMenuByRole(user?.role || user?.systemRole);
    setMenu(roleMenu);
  }, [user]);

  useEffect(() => {
    const key = location?.pathname;
    setSelectedKey([key]);
  }, [location]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapseMenu}
        width={260}
        style={{
          height: '100vh',
          background: '#00195c',
          position: 'sticky',
          borderRight: 'none',
          top: 0,
          overflow: 'hidden auto',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 40,
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <BrandHeader>
            <Avatar
              size={36}
              style={{ backgroundColor: '#274093', fontWeight: 800 }}
            >
              V
            </Avatar>
            {!collapseMenu && (
              <div>
                <h2 className="logo-text">VCMOS</h2>
                <p className="sub-text">Management System</p>
              </div>
            )}
          </BrandHeader>

          <div
            style={{
              height: '100%',
              overflow: 'hidden auto',
              flex: 1,
              padding: '16px 12px',
            }}
          >
            <LayoutLeftMenuStyle
              selectedKeys={selectedKey}
              mode="inline"
              items={menu}
              inlineCollapsed={collapseMenu}
              onClick={onClickMenu}
            />
          </div>

          {!collapseMenu && (
            <div className={styles.bottomPanel}>
              <div className={styles.userInfoRow}>
                <div className={styles.userProfile}>
                  <Avatar
                    src={user?.avatar}
                    size={32}
                    icon={<UserOutlined />}
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: '#112e81',
                    }}
                  />
                  <span className={styles.userName}>
                    {user?.fullName || user?.username || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className={styles.logoutBtn}
                  title="Đăng xuất"
                >
                  <LogoutOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
              <div
                onClick={() => navigate(ROUTER.HOME)}
                className={styles.homeBtn}
              >
                <HomeOutlined style={{ fontSize: '16px' }} />
                <span className={styles.homeText}>Trang chủ</span>
              </div>
            </div>
          )}
        </div>
      </Sider>

      <Layout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: colorBgContainer,
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <Button
            type="text"
            icon={<PanelLeftIcon color="#475569" size={18} />}
            size="middle"
            onClick={() => setCollapseMenu(pre => !pre)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          />
          <Breadcrumb />
        </div>

        <Content
          style={{
            background: '#f8fafc',
            minHeight: 'calc(100vh - 57px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
