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
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 32px -16px rgba(15, 23, 42, 0.12);

  /* Hospital photo on the right, fading into the white background */
  background-image: url('/images/vcmos_hospital_hero.jpg');
  background-size: auto 100%;
  background-position: right center;
  background-repeat: no-repeat;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      #ffffff 0%,
      #ffffff 40%,
      rgba(255, 255, 255, 0.85) 54%,
      rgba(255, 255, 255, 0.25) 70%,
      rgba(255, 255, 255, 0) 84%
    );
    z-index: 1;
  }

  /* Small screens: photo on top, text below it on white */
  @media (max-width: 900px) {
    background-size: 100% auto;
    background-position: top center;

    &::before {
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0) 150px,
        #ffffff 230px
      );
    }
  }

  .banner-content {
    position: relative;
    z-index: 2;
    padding: 44px 48px 32px 48px;
    max-width: 720px;

    @media (max-width: 900px) {
      padding: 230px 24px 32px;
    }

    .breadcrumb-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 24px;
      letter-spacing: 0.2px;

      .home-icon {
        color: #0d9488;
        font-size: 15px;
      }

      .separator {
        color: #94a3b8;
      }

      .clinic-tag {
        color: #0f766e;
        background: #f0fdfa;
        padding: 3px 10px;
        border-radius: 9999px;
        border: 1px solid #ccfbf1;
      }
    }

    h1.hospital-title {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0 0 18px 0;

      @media (max-width: 768px) {
        font-size: 30px;
      }
    }

    p.hospital-subtitle {
      font-size: 17.5px;
      color: #475569;
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
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.22);
        transition: all 0.2s ease;

        &:hover {
          background-color: #0f766e !important;
          border-color: #0f766e !important;
          transform: translateY(-1px);
        }
      }

      .btn-outline-light {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #0f172a;
        height: 46px;
        padding: 0 22px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14.5px;
        transition: all 0.2s ease;

        &:hover {
          background: #f0fdfa !important;
          border-color: #0d9488 !important;
          color: #0f766e !important;
          transform: translateY(-1px);
        }
      }
    }
  }

  /* Sub-navigation bar: light teal tint over the bottom of the photo */
  .hospital-subnav {
    position: relative;
    z-index: 2;
    background: rgba(240, 253, 250, 0.94);
    border-top: 1px solid #ccfbf1;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
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
        color: #134e4a;
        font-size: 13.5px;
        font-weight: 600;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;

        .anticon {
          color: #0d9488;
        }

        &:hover {
          color: #0d9488;
          transform: translateY(-1px);
        }

        &.highlight {
          color: #0f766e;
          font-weight: 700;
        }
      }
    }

    .subnav-hours {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      font-weight: 500;

      .icon {
        color: #0d9488;
        font-size: 15px;
      }

      strong {
        color: #0f172a;
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
  onScrollToAi?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToBooking }) => {
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
            <span>Hệ Thống Y Tế Thú Y Toàn Diện</span>
            <span className="separator">&rsaquo;</span>
            <span className="clinic-tag">Bệnh Viện Thú Y Hòa Lạc, Hà Nội</span>
          </div>

          <h1 className="hospital-title">Bệnh Viện & Phòng Khám Thú Y VCMOS</h1>

          <p className="hospital-subtitle">
            Hệ thống y tế thú y chuẩn lâm sàng hàng đầu. Đồng hành chăm sóc trọn
            đời cùng thú cưng với hồ sơ bệnh án điện tử SOAP, chẩn đoán cận lâm
            sàng kỹ thuật số hiện đại và đội ngũ bác sĩ tận tâm.
          </p>

          <div className="cta-button-group">
            <Button
              className="btn-primary-booking"
              icon={<CalendarOutlined />}
              onClick={handleBookingClick}
            >
              Đặt lịch hẹn khám ưu tiên
            </Button>
            <Button
              className="btn-outline-light"
              onClick={() => scrollToSection('services')}
            >
              Dịch vụ & Bảng giá &rsaquo;
            </Button>
            <Button
              className="btn-outline-light"
              onClick={() => scrollToSection('doctors')}
            >
              Đội ngũ Bác sĩ
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
              href="#quick-booking"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('quick-booking');
              }}
            >
              <CalendarOutlined /> Đặt lịch hẹn khám
            </a>
            <a
              href="#community"
              className="subnav-item"
              onClick={e => {
                e.preventDefault();
                scrollToSection('community');
              }}
            >
              <FileTextOutlined /> Ca bệnh hồi phục & Đánh giá
            </a>
          </div>

          <div className="subnav-hours">
            <ClockCircleOutlined className="icon" />
            <span>
              Giờ tiếp nhận: <strong>08:00 - 20:00</strong> (Tất cả các ngày
              trong tuần)
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
            <h4>Khám & Spa Liên Tiếp</h4>
            <p>
              Quy trình hẹn khám một chạm, kết hợp khám bệnh và spa vệ sinh khép
              kín, không mất thời gian chờ đợi.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <FileTextOutlined />
          </div>
          <div className="info-body">
            <h4>Bệnh Án Điện Tử EMR</h4>
            <p>
              Lưu trữ số hóa toàn bộ tiền sử bệnh, kết quả xét nghiệm, lịch tiêm
              chủng và đơn thuốc trọn đời của bé.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <SafetyCertificateOutlined />
          </div>
          <div className="info-body">
            <h4>Bảng Giá Minh Bạch</h4>
            <p>
              Công khai 100% chi phí khám, xét nghiệm và vật tư y tế. Cam kết
              chỉ định đúng phác đồ, không phát sinh chi phí.
            </p>
          </div>
        </div>

        <div className="info-card">
          <div className="icon-box">
            <PhoneOutlined />
          </div>
          <div className="info-body">
            <h4>Cấp Cứu & Hỗ Trợ 24/7</h4>
            <p>
              Hotline khẩn cấp: <strong>0902.099.905</strong>. Bác sĩ trực sẵn
              sàng tư vấn sơ cứu và tiếp nhận cấp cứu tức thì.
            </p>
          </div>
        </div>
      </QuickInfoGrid>
    </HeroOuterWrapper>
  );
};

export default HeroSection;
