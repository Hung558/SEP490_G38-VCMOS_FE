import { useEffect } from 'react';
import { Button, Layout, Popover, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import MenuUser from '@/components/layout/Header/components/MenuUser';

const { Header } = Layout;

const StyledHeader = styled(Header)`
  position: sticky;
  top: 0;
  z-index: 50;
  height: 68px;
  background-color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);

  .left-section {
    display: flex;
    align-items: center;
    gap: 32px;

    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;

      .logo-box {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        background-color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
      }

      .brand-title {
        color: #0f172a;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0;
      }

      .brand-badge {
        font-size: 11px;
        font-weight: 600;
        color: #0d9488;
        background-color: #f0fdfa;
        padding: 2px 8px;
        border-radius: 9999px;
        border: 1px solid #ccfbf1;
        letter-spacing: 0.2px;

        @media (max-width: 640px) {
          display: none;
        }
      }
    }
  }

  .nav-section {
    display: flex;
    align-items: center;
    gap: 24px;

    a {
      color: #475569;
      font-size: 14.5px;
      font-weight: 500;
      text-decoration: none;
      transition: color 0.15s ease-in-out;
      padding: 6px 4px;
      position: relative;

      &:hover {
        color: #0d9488;
      }

      &.active {
        color: #0d9488;
        font-weight: 600;
      }
    }
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;

    .btn-login {
      color: #334155;
      font-weight: 600;
      font-size: 14px;
      border: none;
      background: transparent;
      padding: 0 12px;

      &:hover {
        color: #0d9488 !important;
        background: #f8fafc !important;
      }
    }

    .btn-booking {
      background-color: #0d9488;
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      border-radius: 8px;
      border: 1px solid #0d9488;
      height: 38px;
      padding: 0 18px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.15s ease-in-out;

      &:hover {
        background-color: #0f766e !important;
        border-color: #0f766e !important;
        color: #ffffff !important;
      }
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: #0f172a;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.15s;

      &:hover {
        background: #f1f5f9;
      }

      .username {
        font-weight: 600;
        font-size: 14px;
        color: #0f172a;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  @media (max-width: 1024px) {
    padding: 0 20px;
    .nav-section {
      display: none;
    }
  }
`;

const HomeHeader = ({ hideSearch: _hideSearch }: { hideSearch?: boolean }) => {
  const { isLogin } = useIsLogin();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openLogin && !isLogin) {
      navigate(ROUTER.LOGIN, { replace: true, state: {} });
    }
  }, [location.state, isLogin, navigate]);

  useEffect(() => {
    const handleOpenLogin = () => {
      navigate(ROUTER.LOGIN);
    };
    window.addEventListener('open-vcmos-login', handleOpenLogin);
    return () =>
      window.removeEventListener('open-vcmos-login', handleOpenLogin);
  }, [navigate]);

  const openLogin = () => {
    navigate(ROUTER.LOGIN);
  };

  const openRegister = () => {
    navigate(ROUTER.REGISTER);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <StyledHeader>
      <div className="left-section">
        <Link to={ROUTER.DEFAULT} className="brand-link">
          <div className="logo-box">
            {/* Veterinary Paw & Medical Cross Icon */}
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="16" rx="4.5" ry="3.5" />
              <ellipse cx="6" cy="9" rx="2" ry="2.5" />
              <ellipse cx="9.5" cy="4.5" rx="1.7" ry="2.2" />
              <ellipse cx="14.5" cy="4.5" rx="1.7" ry="2.2" />
              <ellipse cx="18" cy="9" rx="2" ry="2.5" />
            </svg>
          </div>
          <span className="brand-title">VCMOS</span>
          <span className="brand-badge">Veterinary Clinic</span>
        </Link>
      </div>

      <div className="nav-section">
        <Link to={ROUTER.HOME} className="active">
          Trang chủ
        </Link>
        <a
          href="#services"
          onClick={e => {
            e.preventDefault();
            scrollToSection('services');
          }}
        >
          Dịch vụ y khoa
        </a>
        <a
          href="#doctors"
          onClick={e => {
            e.preventDefault();
            scrollToSection('doctors');
          }}
        >
          Đội ngũ bác sĩ
        </a>
        <a
          href="#community"
          onClick={e => {
            e.preventDefault();
            scrollToSection('community');
          }}
        >
          Hồ sơ điều trị
        </a>
        {isLogin && <Link to={ROUTER.DASHBOARD}>Bảng điều khiển</Link>}
      </div>

      <div className="right-section">
        {isLogin ? (
          <>
            <Button
              className="btn-booking"
              onClick={() => scrollToSection('quick-booking')}
            >
              Đặt lịch khám
            </Button>
            <Popover
              content={<MenuUser />}
              trigger="hover"
              placement="bottomRight"
            >
              <div className="user-profile">
                <span className="username">
                  {user?.fullName || user?.username}
                </span>
                <Avatar
                  src={user?.avatar}
                  size={34}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#0d9488',
                    border: '1.5px solid #ccfbf1',
                  }}
                />
              </div>
            </Popover>
          </>
        ) : (
          <>
            <Button className="btn-login" onClick={openLogin}>
              Đăng nhập
            </Button>
            <Button
              className="btn-login"
              onClick={openRegister}
              style={{ color: '#0d9488' }}
            >
              Đăng ký
            </Button>
            <Button className="btn-booking" onClick={openLogin}>
              Đặt lịch khám
            </Button>
          </>
        )}
      </div>
    </StyledHeader>
  );
};

export default HomeHeader;
