import { useAuth } from '@/contexts/routerProvider/authContext';
import { useCollapseMenu } from '@/contexts/routerProvider/collapseMenuContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { type MenuItem, getMenuByRole } from '@/routerMap/MenuItem';
import { Layout, Menu, theme, Avatar, Button, Popover } from 'antd';
import { LogoutOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';
import { PanelLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { storage } from '@/lib/storage';
import { EmailVerifyBadge } from '@/components/common/EmailVerifyReminder';
import styles from './mainLayout.module.scss';
import ROUTER from '@/routerMap/ROUTER';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import MenuUser from '../Header/components/MenuUser';

const LayoutLeftMenuStyle = styled(Menu)`
  background: #ffffff !important;
  border-inline-end: none !important;

  .ant-menu-item,
  .ant-menu-submenu-title {
    display: flex;
    align-items: center;
    color: #475569 !important;
    border-radius: 8px !important;
    transition: all 0.15s ease-in-out;
    margin-bottom: 4px;
    height: 42px !important;
    padding-inline: 12px !important;
    font-size: 14px;
    font-weight: 500;

    &:hover {
      background-color: #f8fafc !important;
      color: #0f172a !important;
    }
  }

  .ant-menu-item-selected,
  .ant-menu-submenu-selected > .ant-menu-submenu-title {
    background-color: #f0fdfa !important;
    color: #0d9488 !important;
    font-weight: 600;

    a {
      font-weight: 600;
      color: #0d9488 !important;
    }
    .ant-menu-title-content {
      color: #0d9488 !important;
    }
  }

  .ant-menu-submenu-arrow {
    color: #94a3b8 !important;
  }

  .ant-menu-inline {
    background: #ffffff !important;
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
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;

  .logo-box {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background-color: #0d9488;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: #0f172a;
  }

  .sub-text {
    font-size: 11px;
    color: #64748b;
    margin: 0;
  }
`;

// Right side of the top bar: same "home + account" actions as the homepage header
const TopBarActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;

  .top-user {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .top-user-name {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }

  @media (max-width: 768px) {
    gap: 8px;

    .top-user-name,
    .home-label {
      display: none;
    }
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
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapseMenu}
        width={250}
        style={{
          height: '100vh',
          background: '#ffffff',
          position: 'sticky',
          borderRight: '1px solid #e2e8f0',
          top: 0,
          overflow: 'hidden auto',
          zIndex: 40,
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <BrandHeader>
            <div className="logo-box">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
                <ellipse cx="6" cy="9" rx="2" ry="2.5" />
                <ellipse cx="9.5" cy="4.5" rx="1.7" ry="2.2" />
                <ellipse cx="14.5" cy="4.5" rx="1.7" ry="2.2" />
                <ellipse cx="18" cy="9" rx="2" ry="2.5" />
              </svg>
            </div>
            {!collapseMenu && (
              <div>
                <h2 className="logo-text">VCMOS</h2>
                <p className="sub-text">Clinic Management</p>
              </div>
            )}
          </BrandHeader>

          <div
            style={{
              height: '100%',
              overflow: 'hidden auto',
              flex: 1,
              padding: '14px 10px',
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
                    size={32}
                    icon={<UserOutlined />}
                    style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#0d9488',
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
                  <LogoutOutlined style={{ fontSize: '16px' }} />
                </button>
              </div>
              <div
                onClick={() => navigate(ROUTER.HOME)}
                className={styles.homeBtn}
              >
                <HomeOutlined style={{ fontSize: '15px' }} />
                <span className={styles.homeText}>Trở về Trang chủ</span>
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
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <Button
            type="text"
            icon={<PanelLeftIcon color="#64748b" size={18} />}
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

          <TopBarActions>
            <EmailVerifyBadge />
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate(ROUTER.HOME)}
              aria-label="Trang chủ"
            >
              <span className="home-label">Trang chủ</span>
            </Button>
            <Popover
              content={<MenuUser />}
              trigger="hover"
              placement="bottomRight"
            >
              <div className="top-user">
                <span className="top-user-name">
                  {user?.fullName || user?.username || 'User'}
                </span>
                <Avatar
                  size={34}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#0d9488',
                    border: '1.5px solid #ccfbf1',
                  }}
                />
              </div>
            </Popover>
          </TopBarActions>
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
