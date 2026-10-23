import { useState, useEffect } from 'react';
import { Button, Input, Layout, Popover, Avatar, Modal } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import MenuUser from '@/components/layout/Header/components/MenuUser';
import LoginForm from '@/pages/ANONYMOUS/Login_Register/components/LoginForm';
import RegisterForm from '@/pages/ANONYMOUS/Login_Register/components/RegisterForm';
import ForgotPasswordForm from '@/pages/ANONYMOUS/Login_Register/components/ForgotPasswordForm';
import VerifyAccountForm from '@/pages/ANONYMOUS/Login_Register/components/VerifyAccountForm';
import CompleteProfileForm, {
  type PendingGoogleProfile,
} from '@/pages/ANONYMOUS/Login_Register/components/CompleteProfileForm';

const { Header } = Layout;

const StyledHeader = styled(Header)`
  position: sticky;
  top: 0;
  z-index: 50;
  height: 72px;
  background-color: #00195c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

  .left-section {
    display: flex;
    align-items: center;
    gap: 32px;

    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .search-input {
      width: 320px;
      background-color: rgba(255, 255, 255, 0.1);
      border: none;

      .ant-input {
        background-color: transparent;
        color: #ffffff;
        &::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
      }

      .ant-input-prefix {
        color: rgba(255, 255, 255, 0.7);
        margin-right: 8px;
      }

      &:focus-within {
        background-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
      }
    }
  }

  .nav-section {
    display: flex;
    align-items: center;
    gap: 24px;

    a {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      font-weight: 400;
      transition: all 0.2s;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 16px;

    .login-btn {
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.4);
      background: transparent;

      &:hover {
        color: #ffffff !important;
        border-color: #ffffff !important;
        background: rgba(255, 255, 255, 0.1) !important;
      }
    }

    .register-btn {
      background-color: #ffffff;
      color: #00195c;
      font-weight: 600;
      border: none;

      &:hover {
        background-color: #f0f3ff !important;
        color: #00195c !important;
      }
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: #ffffff;

      .username {
        font-weight: 600;
        font-size: 14.5px;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  @media (max-width: 1024px) {
    .nav-section {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .search-input {
      display: none;
    }
  }
`;

const HomeHeader = ({ hideSearch }: { hideSearch?: boolean }) => {
  const { isLogin } = useIsLogin();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<
    'login' | 'register' | 'forgot' | 'verify' | 'completeProfile'
  >('login');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const [pendingGoogleProfile, setPendingGoogleProfile] =
    useState<PendingGoogleProfile | null>(null);

  const goToVerify = (email: string) => {
    setPendingVerifyEmail(email);
    setAuthView('verify');
  };

  const goToCompleteProfile = (profile: PendingGoogleProfile) => {
    setPendingGoogleProfile(profile);
    setAuthView('completeProfile');
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLogin) {
      setIsAuthModalOpen(false);
    }
  }, [isLogin]);

  useEffect(() => {
    if (location.state?.openLogin && !isLogin) {
      setAuthView('login');
      setIsAuthModalOpen(true);
      // Clean up the state so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isLogin, navigate, location.pathname]);

  const openLogin = () => {
    setAuthView('login');
    setIsAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthView('register');
    setIsAuthModalOpen(true);
  };

  return (
    <StyledHeader>
      <div className="left-section">
        <Link to={ROUTER.DEFAULT} style={{ textDecoration: 'none' }}>
          <h1 className="logo">VCMOS</h1>
        </Link>
        {!hideSearch && (
          <Input
            className="search-input"
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            bordered={false}
          />
        )}
      </div>

      <div className="nav-section">
        <Link to={ROUTER.HOME}>Trang chủ</Link>
        {isLogin && <Link to={ROUTER.DASHBOARD}>Bảng điều khiển</Link>}
      </div>

      <div className="right-section">
        {isLogin ? (
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
                size={38}
                icon={<UserOutlined />}
                style={{
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 2px 8px 1px',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                }}
              />
            </div>
          </Popover>
        ) : (
          <>
            <Button className="login-btn" onClick={openLogin}>
              Đăng nhập
            </Button>
            <Button className="register-btn" onClick={openRegister}>
              Đăng ký
            </Button>
          </>
        )}
      </div>

      <Modal
        open={isAuthModalOpen}
        onCancel={() => setIsAuthModalOpen(false)}
        footer={null}
        width={440}
        centered
        destroyOnClose
        styles={{
          content: { background: 'transparent', boxShadow: 'none', padding: 0 },
          body: { background: 'transparent', padding: 0 },
          mask: {
            background:
              'linear-gradient(135deg, rgba(0, 25, 92, 0.85) 0%, rgba(0, 42, 120, 0.75) 40%, rgba(0, 78, 146, 0.65) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          },
        }}
      >
        {authView === 'login' && (
          <LoginForm
            onToggleView={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot')}
            onNeedsVerification={goToVerify}
            onNeedsProfileCompletion={goToCompleteProfile}
          />
        )}
        {authView === 'register' && (
          <RegisterForm
            onToggleView={() => setAuthView('login')}
            onNeedsVerification={goToVerify}
            onNeedsProfileCompletion={goToCompleteProfile}
          />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordForm onToggleView={() => setAuthView('login')} />
        )}
        {authView === 'verify' && (
          <VerifyAccountForm
            email={pendingVerifyEmail}
            onToggleView={() => setAuthView('login')}
          />
        )}
        {authView === 'completeProfile' && pendingGoogleProfile && (
          <CompleteProfileForm
            profile={pendingGoogleProfile}
            onToggleView={() => setAuthView('login')}
          />
        )}
      </Modal>
    </StyledHeader>
  );
};

export default HomeHeader;
