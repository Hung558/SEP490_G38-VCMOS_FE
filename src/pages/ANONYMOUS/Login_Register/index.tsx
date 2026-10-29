import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import VerifyAccountForm from './components/VerifyAccountForm';
import {
  HomeOutlined,
  ArrowLeftOutlined,
  PlusCircleFilled,
} from '@ant-design/icons';

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at 10% 20%,
    #f0fdfa 0%,
    #e6f7f5 40%,
    #f0fdf4 70%,
    #f8fafc 100%
  );
  padding: 40px 20px;
  position: relative;
  overflow: hidden;

  /* Ambient glowing orbs */
  &::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    top: -150px;
    left: -100px;
    background: radial-gradient(
      circle,
      rgba(13, 148, 136, 0.12) 0%,
      transparent 70%
    );
    border-radius: 50%;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    bottom: -100px;
    right: -100px;
    background: radial-gradient(
      circle,
      rgba(16, 185, 129, 0.1) 0%,
      transparent 70%
    );
    border-radius: 50%;
    pointer-events: none;
  }
`;

const UnifiedAuthCard = styled.div`
  width: 100%;
  max-width: 1040px;
  /* Taller than both the login and register forms, so switching tabs
     never resizes the card or the photo on the left */
  min-height: 720px;
  background: #ffffff;
  border-radius: 28px;
  box-shadow:
    0 25px 60px -15px rgba(13, 148, 136, 0.14),
    0 10px 30px -5px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.9);
  display: flex;
  overflow: hidden;
  position: relative;
  z-index: 2;

  @media (max-width: 960px) {
    flex-direction: column;
    max-width: 520px;
    border-radius: 24px;
    min-height: auto;
  }
`;

/* ================= LEFT COLUMN: HERO SHOWCASE ================= */
const HeroShowcasePanel = styled.div`
  flex: 0 0 46%;
  background: #f8fafc;
  background-image:
    radial-gradient(#e2e8f0 1.2px, transparent 1.2px),
    radial-gradient(#e2e8f0 1.2px, #f8fafc 1.2px);
  background-size: 24px 24px;
  background-position:
    0 0,
    12px 12px;
  padding: 36px 32px 32px 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  border-right: 1px solid #f1f5f9;

  @media (max-width: 960px) {
    display: none;
  }
`;

const DoctorCardWrapper = styled.div`
  position: relative;
  border-radius: 24px;
  background: linear-gradient(155deg, #14b8a6 0%, #0d9488 45%, #0f766e 100%);
  overflow: hidden;
  flex: 1;
  min-height: 420px;
  box-shadow: 0 16px 36px -10px rgba(13, 148, 136, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;

  img.doctor-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    transition: transform 0.5s ease;
  }

  &:hover img.doctor-img {
    transform: scale(1.02);
  }
`;

/* ================= RIGHT COLUMN: INTERACTIVE FORM ================= */
const AuthInteractivePanel = styled.div`
  flex: 1 1 54%;
  padding: 36px 44px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 480px) {
    padding: 32px 20px;
  }
`;

const TopBrandHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;

  .brand-logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;

    .logo-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
    }

    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;

      span.sub {
        color: #0d9488;
      }
    }
  }

  .back-home-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      color: #0d9488;
      background: #f0fdfa;
    }
  }
`;

/* Capsule Segmented Switcher */
const SegmentedCapsule = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f1f5f9;
  border-radius: 9999px;
  padding: 4px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
  position: relative;
`;

const SegmentedItem = styled.button<{ $active: boolean }>`
  border: none;
  background: ${props => (props.$active ? '#ffffff' : 'transparent')};
  color: ${props => (props.$active ? '#0d9488' : '#64748b')};
  font-weight: ${props => (props.$active ? '700' : '600')};
  font-size: 13.5px;
  padding: 9px 16px;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: ${props =>
    props.$active ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none'};
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    color: ${props => (props.$active ? '#0d9488' : '#0f172a')};
  }
`;

const BackToLoginButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #0d9488;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-bottom: 18px;
  transition: color 0.2s;

  &:hover {
    color: #0f766e;
    text-decoration: underline;
  }
`;

type AuthView = 'login' | 'register' | 'forgot' | 'verify';

const LoginRegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialView = (): AuthView => {
    if (location.pathname === ROUTER.REGISTER) return 'register';
    if (location.pathname === ROUTER.FORGOT_PASSWORD) return 'forgot';
    return 'login';
  };

  const [authView, setAuthView] = useState<AuthView>(getInitialView());
  const [prefilledIdentifier, setPrefilledIdentifier] = useState<string>('');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');

  useEffect(() => {
    if (location.pathname === ROUTER.REGISTER) {
      setAuthView('register');
    } else if (location.pathname === ROUTER.FORGOT_PASSWORD) {
      setAuthView('forgot');
    } else if (location.pathname === ROUTER.LOGIN) {
      setAuthView('login');
    }
  }, [location.pathname]);

  const handleToggleToRegister = () => {
    setAuthView('register');
    navigate(ROUTER.REGISTER, { replace: true });
  };

  const handleToggleToLogin = (registeredIdentifier?: string) => {
    if (registeredIdentifier) {
      setPrefilledIdentifier(registeredIdentifier);
    }
    setAuthView('login');
    navigate(ROUTER.LOGIN, { replace: true });
  };

  const handleToggleToForgot = () => {
    setAuthView('forgot');
    navigate(ROUTER.FORGOT_PASSWORD, { replace: true });
  };

  const goToVerify = (email: string) => {
    setPendingVerifyEmail(email);
    setAuthView('verify');
  };

  const showSegmentedTabs = authView === 'login' || authView === 'register';

  return (
    <PageWrapper>
      <UnifiedAuthCard>
        {/* Left Hero Illustration Showcase */}
        <HeroShowcasePanel>
          <DoctorCardWrapper>
            <img
              src="/images/auth_doctor_banner.jpg"
              alt="Bác sĩ thú y VCMOS"
              className="doctor-img"
            />
          </DoctorCardWrapper>
        </HeroShowcasePanel>

        {/* Right Form Interaction Panel */}
        <AuthInteractivePanel>
          <TopBrandHeader>
            <Link to={ROUTER.HOME} className="brand-logo">
              <div className="logo-badge">
                <PlusCircleFilled />
              </div>
              <div className="brand-name">
                VCMOS <span className="sub">Clinic</span>
              </div>
            </Link>

            <Link to={ROUTER.HOME} className="back-home-link">
              <HomeOutlined /> Trang chủ
            </Link>
          </TopBrandHeader>

          {/* Capsule Pill Switcher (New Patient / Existing Patient) */}
          {showSegmentedTabs && (
            <SegmentedCapsule>
              <SegmentedItem
                type="button"
                $active={authView === 'register'}
                onClick={handleToggleToRegister}
              >
                Khách hàng mới
              </SegmentedItem>

              <SegmentedItem
                type="button"
                $active={authView === 'login'}
                onClick={() => handleToggleToLogin()}
              >
                Đã có tài khoản
              </SegmentedItem>
            </SegmentedCapsule>
          )}

          {/* Back button for other views */}
          {!showSegmentedTabs && (
            <BackToLoginButton
              type="button"
              onClick={() => handleToggleToLogin()}
            >
              <ArrowLeftOutlined /> Quay lại đăng nhập
            </BackToLoginButton>
          )}

          {/* Form views */}
          {authView === 'login' && (
            <LoginForm
              initialIdentifier={prefilledIdentifier}
              onToggleView={handleToggleToRegister}
              onForgotPassword={handleToggleToForgot}
              onNeedsVerification={goToVerify}
            />
          )}

          {authView === 'register' && (
            <RegisterForm
              onToggleView={handleToggleToLogin}
              onNeedsVerification={goToVerify}
            />
          )}

          {authView === 'forgot' && (
            <ForgotPasswordForm onToggleView={() => handleToggleToLogin()} />
          )}

          {authView === 'verify' && (
            <VerifyAccountForm
              email={pendingVerifyEmail}
              onToggleView={() => handleToggleToLogin()}
            />
          )}
        </AuthInteractivePanel>
      </UnifiedAuthCard>
    </PageWrapper>
  );
};

export default LoginRegisterPage;
