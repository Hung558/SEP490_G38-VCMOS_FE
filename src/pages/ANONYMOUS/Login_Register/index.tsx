import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import VerifyAccountForm from './components/VerifyAccountForm';
import CompleteProfileForm from './components/CompleteProfileForm';
import {
  HomeOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
} from '@ant-design/icons';

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  background-color: #f8fafc;

  @media (max-width: 960px) {
    flex-direction: column;
  }
`;

const BrandPanel = styled.div`
  flex: 1;
  position: relative;
  background: #0f172a;
  background-image: url('/images/vcmos_hospital_hero.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
  overflow: hidden;

  /* Dark Navy Overlay for High Contrast */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      145deg,
      rgba(15, 23, 42, 0.95) 0%,
      rgba(15, 59, 92, 0.9) 50%,
      rgba(13, 148, 136, 0.82) 100%
    );
    z-index: 1;
  }

  .panel-content {
    position: relative;
    z-index: 2;
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .back-home {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
        transform: translateX(-2px);
      }
    }
  }

  .center-info {
    max-width: 520px;
    margin: 40px 0;

    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(13, 148, 136, 0.3);
      border: 1px solid rgba(94, 234, 212, 0.4);
      color: #5eead4;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.25;
      color: #ffffff;
      margin: 0 0 16px 0;
      letter-spacing: -0.025em;

      @media (max-width: 1200px) {
        font-size: 30px;
      }
    }

    p.desc {
      font-size: 16px;
      color: #cbd5e1;
      line-height: 1.6;
      margin: 0 0 32px 0;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        color: #f1f5f9;
        font-size: 14.5px;
        line-height: 1.5;

        .icon {
          color: #2dd4bf;
          font-size: 18px;
          margin-top: 2px;
          flex-shrink: 0;
        }

        strong {
          color: #ffffff;
        }
      }
    }
  }

  .footer-info {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 20px;
    color: #94a3b8;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;

    .hotline {
      color: #ffffff;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  @media (max-width: 960px) {
    padding: 32px 24px;
    min-height: auto;

    .center-info {
      margin: 24px 0;
    }
  }
`;

const FormPanel = styled.div`
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background-color: #ffffff;

  @media (max-width: 960px) {
    max-width: 100%;
    padding: 32px 16px;
  }
`;

type AuthView = 'login' | 'register' | 'forgot' | 'verify' | 'completeProfile';

const LoginRegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialView = (): AuthView => {
    if (location.pathname === ROUTER.REGISTER) return 'register';
    if (location.pathname === ROUTER.FORGOT_PASSWORD) return 'forgot';
    return 'login';
  };

  const [authView, setAuthView] = useState<AuthView>(getInitialView());
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState<{
    googleAccessToken: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  } | null>(null);

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
    navigate(ROUTER.REGISTER);
  };

  const handleToggleToLogin = () => {
    navigate(ROUTER.LOGIN);
  };

  const handleToggleToForgot = () => {
    navigate(ROUTER.FORGOT_PASSWORD);
  };

  const goToVerify = (email: string) => {
    setPendingVerifyEmail(email);
    setAuthView('verify');
  };

  const goToCompleteProfile = (profile: {
    googleAccessToken: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) => {
    setPendingGoogleProfile(profile);
    setAuthView('completeProfile');
  };

  return (
    <PageWrapper>
      {/* Left Medical Brand Showcase */}
      <BrandPanel>
        <div className="panel-content top-bar">
          <Link to={ROUTER.HOME} className="back-home">
            <HomeOutlined /> Quay về trang chủ
          </Link>
        </div>

        <div className="panel-content center-info">
          <div className="pill-badge">
            <MedicineBoxOutlined />
            <span>Phòng Khám Thú Y VCMOS</span>
          </div>

          <h1>Cổng Dịch Vụ Y Tế & Chăm Sóc Thú Cưng</h1>

          <p className="desc">
            Đăng nhập để theo dõi hồ sơ bệnh án điện tử, đặt lịch khám chữa
            bệnh, tiêm chủng định kỳ và dịch vụ spa làm đẹp cho thú cưng của
            bạn.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <SafetyCertificateOutlined className="icon" />
              <div>
                <strong>Bệnh án điện tử EMR trọn đời:</strong> Lưu trữ kết quả
                xét nghiệm, siêu âm, đơn thuốc và lịch sử phẫu thuật minh bạch.
              </div>
            </div>

            <div className="feature-item">
              <CalendarOutlined className="icon" />
              <div>
                <strong>Đặt lịch khám & Spa một chạm:</strong> Chọn ngày giờ và
                bác sĩ phụ trách nhanh gọn, không cần xếp hàng bốc số.
              </div>
            </div>

            <div className="feature-item">
              <HeartOutlined className="icon" />
              <div>
                <strong>Đồng hành sức khỏe trọn vẹn:</strong> Nhận nhắc nhở lịch
                tiêm phòng và theo dõi tiến trình hồi phục của thú cưng chu đáo.
              </div>
            </div>
          </div>
        </div>

        <div className="panel-content footer-info">
          <div>Cơ sở Hòa Lạc, Thạch Thất, Hà Nội</div>
          <div className="hotline">
            <PhoneOutlined /> Hotline: (024) 7300 8888
          </div>
        </div>
      </BrandPanel>

      {/* Right Form Card Container */}
      <FormPanel>
        {authView === 'login' && (
          <LoginForm
            onToggleView={handleToggleToRegister}
            onForgotPassword={handleToggleToForgot}
            onNeedsVerification={goToVerify}
            onNeedsProfileCompletion={goToCompleteProfile}
          />
        )}

        {authView === 'register' && (
          <RegisterForm
            onToggleView={handleToggleToLogin}
            onNeedsVerification={goToVerify}
            onNeedsProfileCompletion={goToCompleteProfile}
          />
        )}

        {authView === 'forgot' && (
          <ForgotPasswordForm onToggleView={handleToggleToLogin} />
        )}

        {authView === 'verify' && (
          <VerifyAccountForm
            email={pendingVerifyEmail}
            onToggleView={handleToggleToLogin}
          />
        )}

        {authView === 'completeProfile' && pendingGoogleProfile && (
          <CompleteProfileForm
            profile={pendingGoogleProfile}
            onToggleView={handleToggleToLogin}
          />
        )}
      </FormPanel>
    </PageWrapper>
  );
};

export default LoginRegisterPage;
