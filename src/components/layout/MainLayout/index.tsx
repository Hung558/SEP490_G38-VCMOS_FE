import { useAuth } from '@/contexts/routerProvider/authContext';
import { useCollapseMenu } from '@/contexts/routerProvider/collapseMenuContext';
import { useLogout } from '@/hooks/Common/useLogout';
import { type MenuItem, getMenuByRole } from '@/routerMap/MenuItem';
import { Layout, Menu, theme, Avatar, Button, Drawer, Grid } from 'antd';
import { LogoutOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';
import { PanelLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { getRoleGroup, getRoleLabel, normalizeRole } from '@/constants/roles';
import styles from './mainLayout.module.scss';
import ROUTER from '@/routerMap/ROUTER';
import { getSidebarSelection } from '@/routerMap/sidebarSelection';
import Breadcrumb from '../Breadcrumb/Breadcrumb';

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

// Pet owners retain the home shortcut; account actions stay in the sidebar.
const TopBarActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    .home-label {
      display: none;
    }
  }
`;

// AntD portals live outside the page wrappers. Keep both range calendars and
// their presets reachable on phones rather than clipping the first calendar.
const ResponsiveOverlays = createGlobalStyle`
  @media (max-width: 767px) {
    .ant-picker-dropdown {
      position: fixed !important;
      top: 12vh !important;
      left: 8px !important;
      max-width: calc(100vw - 16px);
    }
    .ant-picker-dropdown .ant-picker-panel-container {
      max-width: calc(100vw - 16px);
      max-height: 70vh;
      overflow: auto;
    }
    .ant-picker-dropdown .ant-picker-panel-layout,
    .ant-picker-dropdown .ant-picker-panels {
      flex-direction: column;
    }
    .ant-picker-dropdown .ant-picker-presets {
      width: auto;
      max-width: none;
      max-height: 100px;
      overflow: auto;
      flex: none;
    }
    .ant-picker-dropdown .ant-picker-panel-container .ant-picker-presets ul {
      height: auto;
      flex: none;
    }
    .ant-picker-dropdown .ant-picker-range-arrow { display: none; }
  }
`;

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 30;

  > button,
  > ${TopBarActions} {
    flex-shrink: 0;
  }
  > .location-trail {
    flex: 1;
    min-width: 0;
    nav {
      flex-wrap: wrap;
    }
    span {
      overflow-wrap: anywhere;
    }
  }
  @media (max-width: 991px) {
    padding: 10px 12px;
  }
`;

const { Content, Sider } = Layout;

const MainLayout = ({ ...rest }: any) => {
  const { children } = rest;
  const { collapseMenu, setCollapseMenu } = useCollapseMenu();
  const screens = Grid.useBreakpoint();
  const isCompact = !screens.lg;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuCollapsed = !isCompact && collapseMenu;
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState<string[]>([
    getSidebarSelection(location.pathname, location.search),
  ]);
  const { user } = useAuth();
  const handleLogout = useLogout();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const onClickMenu = (menuInfo: any) => {
    setSelectedKey(menuInfo.keyPath);
    setMobileMenuOpen(false);
    if (!menuInfo.key.includes('subkey')) navigate(menuInfo.key);
  };

  useEffect(() => {
    const roleMenu = getMenuByRole(user?.role || user?.systemRole);
    setMenu(roleMenu);
  }, [user]);

  // 24/11: Admin and clinic staff work only here, so no "Trang chủ" buttons;
  // pet owners keep both
  const role = user?.role || user?.systemRole;
  const showHomeLinks =
    Boolean(normalizeRole(role)) && getRoleGroup(role) === 'owner';

  useEffect(() => {
    const key = getSidebarSelection(location.pathname, location.search);
    setSelectedKey([key]);
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [isCompact]);

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BrandHeader>
        <div className="logo-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
            <ellipse cx="6" cy="9" rx="2" ry="2.5" />
            <ellipse cx="9.5" cy="4.5" rx="1.7" ry="2.2" />
            <ellipse cx="14.5" cy="4.5" rx="1.7" ry="2.2" />
            <ellipse cx="18" cy="9" rx="2" ry="2.5" />
          </svg>
        </div>
        {!menuCollapsed && (
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
          inlineCollapsed={menuCollapsed}
          onClick={onClickMenu}
        />
      </div>

      {!menuCollapsed && (
        <div className={styles.bottomPanel}>
          <div className={styles.userInfoRow}>
            <div className={styles.userProfile}>
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#0d9488',
                  flexShrink: 0,
                }}
              />
              <div className={styles.userMeta}>
                <span className={styles.userName}>
                  {user?.fullName || user?.username || 'User'}
                </span>
                <span className={styles.userRole}>
                  {getRoleLabel(user?.role || user?.systemRole)}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Đăng xuất"
            >
              <LogoutOutlined style={{ fontSize: '16px' }} />
            </button>
          </div>
          {showHomeLinks && (
            <div
              onClick={() => navigate(ROUTER.HOME)}
              className={styles.homeBtn}
            >
              <HomeOutlined style={{ fontSize: '15px' }} />
              <span className={styles.homeText}>Trở về Trang chủ</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <ResponsiveOverlays />
      {!isCompact && (
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
          {sidebarContent}
        </Sider>
      )}
      {isCompact && (
        <Drawer
          title="Điều hướng"
          aria-label="Điều hướng"
          placement="left"
          width="min(280px, calc(100vw - 32px))"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ minWidth: 0 }}>
        <HeaderBar style={{ background: colorBgContainer }}>
          <Button
            type="text"
            icon={<PanelLeftIcon color="#64748b" size={18} />}
            size="middle"
            aria-label={
              isCompact ? 'Mở menu điều hướng' : 'Thu gọn hoặc mở rộng menu'
            }
            aria-expanded={isCompact ? mobileMenuOpen : !collapseMenu}
            onClick={() =>
              isCompact ? setMobileMenuOpen(true) : setCollapseMenu(pre => !pre)
            }
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          />
          <div className="location-trail">
            <Breadcrumb />
          </div>

          <TopBarActions>
            {showHomeLinks && (
              <Button
                icon={<HomeOutlined />}
                onClick={() => navigate(ROUTER.HOME)}
                aria-label="Trang chủ"
              >
                <span className="home-label">Trang chủ</span>
              </Button>
            )}
          </TopBarActions>
        </HeaderBar>

        <Content
          style={{
            background: '#f8fafc',
            minWidth: 0,
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
