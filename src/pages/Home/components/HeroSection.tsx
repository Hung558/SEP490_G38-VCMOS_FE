import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import {
  CalendarOutlined,
  HomeFilled,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

const HeroOuterWrapper = styled.section`
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 20px 48px 20px;
`;

const HospitalBannerCard = styled.div`
  position: relative;
  width: 100%;
  min-height: 520px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow:
    0 12px 36px -8px rgba(15, 23, 42, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.08);

  /* Background Hospital Photography */
  background-image: url('/images/vcmos_hospital_hero.jpg');
  background-size: cover;
  background-position: center right;
  background-repeat: no-repeat;

  /* Left-heavy gradient overlay for WCAG AAA text legibility */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(15, 23, 42, 0.94) 0%,
      rgba(15, 23, 42, 0.88) 38%,
      rgba(15, 23, 42, 0.55) 65%,
      rgba(15, 23, 42, 0.15) 100%
    );
    z-index: 1;

    @media (max-width: 900px) {
      background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.96) 0%,
        rgba(15, 23, 42, 0.88) 100%
      );
    }
  }

  .banner-content {
    position: relative;
    z-index: 2;
    padding: 44px 48px 32px 48px;
    max-width: 720px;

    @media (max-width: 768px) {
      padding: 32px 24px;
    }

    .breadcrumb-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 24px;
      letter-spacing: 0.2px;

      .home-icon {
        color: #fbbf24;
        font-size: 15px;
      }

      .separator {
        color: rgba(255, 255, 255, 0.5);
      }

      .clinic-tag {
        color: #5eead4;
        background: rgba(13, 148, 136, 0.25);
        padding: 3px 10px;
        border-radius: 9999px;
        border: 1px solid rgba(45, 212, 191, 0.3);
      }
    }

    h1.hospital-title {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.2;
      color: #ffffff;
      letter-spacing: -0.025em;
      margin: 0 0 18px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

      @media (max-width: 768px) {
        font-size: 30px;
      }
    }

    p.hospital-subtitle {
      font-size: 17.5px;
      color: rgba(241, 245, 249, 0.94);
      line-height: 1.6;
      margin: 0 0 32px 0;
      max-width: 600px;
      font-weight: 400;

      @media (max-width: 768px) {
        font-size: 15px;
        margin-bottom: 24px;
      }
    }

    .cta-button-group {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;

      .btn-primary-booking {
        background-color: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
        height: 46px;
        padding: 0 26px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
        transition: all 0.2s ease;

        &:hover {
          background-color: #0f766e !important;
          border-color: #0f766e !important;
          transform: translateY(-1px);
        }
      }

      .btn-outline-white {
        background: rgba(255, 255, 255, 0.12);
        border: 1.5px solid rgba(255, 255, 255, 0.6);
        color: #ffffff;
        height: 46px;
        padding: 0 22px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14.5px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.24) !important;
          border-color: #ffffff !important;
          color: #ffffff !important;
          transform: translateY(-1px);
        }
      }
    }
  }

  /* Sub-Navigation Bar - matches system primary clinical teal */
  .hospital-subnav {
    position: relative;
    z-index: 2;
    background: #0f766e;
    background: linear-gradient(90deg, #115e59 0%, #0d9488 50%, #0f766e 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 56px;
    flex-wrap: wrap;
    gap: 12px;

    @media (max-width: 900px) {
      padding: 12px 20px;
    }

    .subnav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;

      @media (max-width: 640px) {
        gap: 14px;
      }

      a.subnav-item {
        color: #ffffff;
        font-size: 13.5px;
        font-weight: 600;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;

        &:hover {
          color: #ccfbf1;
          transform: translateY(-1px);
        }

        &.highlight {
          color: #fef08a;
          font-weight: 700;
        }
      }
    }

    .subnav-hours {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #ffffff;
      font-weight: 500;

      .icon {
        color: #fef08a;
        font-size: 15px;
      }

      strong {
        color: #ffffff;
        font-weight: 700;
      }
    }
  }
`;

const QuickInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }

  .info-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;

    &:hover {
      border-color: #99f6e4;
      box-shadow: 0 6px 16px rgba(13, 148, 136, 0.08);
      transform: translateY(-2px);

      .icon-box {
        background: #0d9488;
        color: #ffffff;
        border-color: #0d9488;
      }
    }

    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #f0fdfa;
      color: #0d9488;
      border: 1px solid #ccfbf1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .info-body {
      h4 {
        margin: 0 0 4px 0;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      p {
        margin: 0;
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
      }
    }
  }
`;

interface HeroSectionProps {
  onScrollToBooking: () => void;
  onScrollToAi: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToBooking,
  onScrollToAi,
}) => {
  const { isLogin } = useIsLogin();

  const handleBookingClick = () => {
    if (!isLogin) {
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
    } else {
      onScrollToBooking();
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HeroOuterWrapper>
      {/* UCLA Health-Style Hospital Hero Banner */}
      <HospitalBannerCard>
        <div className="banner-content">
          <div className="breadcrumb-row">
            <HomeFilled className="home-icon" />
            <span className="separator">&rsaquo;</span>
            <span>Hệ Thống Y Tế Thú Cưng</span>
            <span className="separator">&rsaquo;</span>
            <span className="clinic-tag">Cơ sở Hòa Lạc, Hà Nội</span>
          </div>

          <h1 className="hospital-title">Bệnh Viện & Phòng Khám Thú Y VCMOS</h1>

          <p className="hospital-subtitle">
            Tiêu chuẩn y khoa hàng đầu trong chăm sóc, chẩn đoán cận lâm sàng,
            phẫu thuật ngoại khoa và quản lý hồ sơ bệnh án trọn đời cùng thú
            cưng.
          </p>

          <div className="cta-button-group">
            <Button
              className="btn-primary-booking"
              icon={<CalendarOutlined />}
              onClick={handleBookingClick}
            >
              Đặt lịch hẹn khám
            </Button>
            <Button
              className="btn-outline-white"
              onClick={() => scrollToSection('services')}
            >
              Dịch vụ & Bảng giá &rsaquo;
            </Button>
            <Button className="btn-outline-white" onClick={onScrollToAi}>
              Sàng lọc phân loại (Triage)
            </Button>
          </div>
        </div>

        {/* Bottom Subnav Bar (UCLA Health Sub-Bar pattern) */}
        <div className="hospital-subnav">
          <div className="subnav-links">
            <a
              href="#services"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('services');
              }}
            >
              <MedicineBoxOutlined /> Dịch vụ chuyên khoa
            </a>
            <a
              href="#doctors"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('doctors');
              }}
            >
              <TeamOutlined /> Đội ngũ Bác sĩ
            </a>
            <a
              href="#triage"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('triage');
              }}
            >
              <SafetyCertificateOutlined /> Sàng lọc lâm sàng (Triage)
            </a>
            <a
              href="#community"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('community');
              }}
            >
              <FileTextOutlined /> Đánh giá & Cộng đồng
            </a>
          </div>

          <div className="subnav-hours">
            <ClockCircleOutlined className="icon" />
            <span>
              Giờ tiếp nhận: <strong>08:00 - 20:00</strong> (Tất cả các ngày)
            </span>
          </div>
        </div>
      </HospitalBannerCard>

      {/* Clinical Feature Highlights Strip */}
      <QuickInfoGrid>
        <div className="info-card">
          <div className="icon-box">
            <CalendarOutlined />
          </div>
          <div className="info-body">
            <h4>Khám & Spa liên tiếp</h4>
            <p>
              Quy trình hẹn khám một chạm, chọn bác sĩ và loại hình dịch vụ
              không phải chờ đợi.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <FileTextOutlined />
          </div>
          <div className="info-body">
            <h4>Bệnh án điện tử EMR</h4>
            <p>
              Lưu trữ tiền sử bệnh, kết quả xét nghiệm, lịch tiêm phòng và đơn
              thuốc trọn đời.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <SafetyCertificateOutlined />
          </div>
          <div className="info-body">
            <h4>Bảng giá minh bạch</h4>
            <p>
              Niêm yết công khai từng dịch vụ, vật tư y tế và cam kết không phát
              sinh phụ phí.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <PhoneOutlined />
          </div>
          <div className="info-body">
            <h4>Hỗ trợ & Tiếp đón</h4>
            <p>
              Hotline: <strong>(024) 7300 8888</strong>. Tư vấn đặt chỗ & hướng
              dẫn đưa thú cưng tới khám.
            </p>
          </div>
        </div>
      </QuickInfoGrid>
    </HeroOuterWrapper>
  );
};

export default HeroSection;
