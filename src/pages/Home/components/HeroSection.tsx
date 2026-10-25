import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import {
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  SafetyCertificateFilled,
} from '@ant-design/icons';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 60px 24px 80px 24px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: center;
  gap: 48px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 40px 16px 60px 16px;
    gap: 36px;
  }
`;

const ContentCol = styled.div`
  .category-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    background: #e0f2f1;
    color: #00796b;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .main-heading {
    font-size: 46px;
    font-weight: 900;
    line-height: 1.2;
    color: #0f172a;
    margin: 0 0 20px 0;
    letter-spacing: -1px;

    .highlight {
      color: #00796b;
      position: relative;
    }

    @media (max-width: 640px) {
      font-size: 32px;
    }
  }

  .description {
    font-size: 17px;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 32px 0;
  }

  .btn-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 36px;

    .btn-booking {
      background: #00695c;
      border-color: #00695c;
      color: #ffffff;
      height: 52px;
      padding: 0 32px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 16px rgba(0, 105, 92, 0.25);
      &:hover {
        background: #004d40 !important;
        border-color: #004d40 !important;
        transform: translateY(-2px);
      }
    }

    .btn-ai {
      background: #ffffff;
      border: 1.5px solid #00796b;
      color: #00796b;
      height: 52px;
      padding: 0 28px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      &:hover {
        background: #e0f2f1 !important;
        border-color: #004d40 !important;
        color: #004d40 !important;
      }
    }
  }

  .features-strip {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 13.5px;
    color: #334155;
    font-weight: 600;

    .item {
      display: flex;
      align-items: center;
      gap: 6px;
      svg {
        color: #10b981;
      }
    }
  }
`;

const VisualCol = styled.div`
  position: relative;

  .image-card {
    background: linear-gradient(135deg, #ccfbf1 0%, #e0f2fe 100%);
    border-radius: 36px;
    padding: 16px;
    box-shadow: 0 20px 50px rgba(0, 77, 64, 0.1);
    position: relative;
    overflow: hidden;

    img {
      width: 100%;
      height: 480px;
      object-fit: cover;
      border-radius: 24px;
      display: block;
    }
  }

  /* Floating Badges */
  .badge-top {
    position: absolute;
    top: 24px;
    right: 24px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 10px 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;

    .dot {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    strong {
      color: #0f172a;
    }
    span {
      color: #64748b;
      font-size: 11px;
      display: block;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.4;
        transform: scale(1.2);
      }
    }
  }

  .badge-bottom-left {
    position: absolute;
    bottom: 24px;
    left: 24px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 12px 18px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;

    .icon-star {
      width: 36px;
      height: 36px;
      background: #fef3c7;
      color: #f59e0b;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .rating {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .sub {
      font-size: 11.5px;
      color: #64748b;
    }
  }

  .badge-bottom-right {
    position: absolute;
    bottom: 24px;
    right: 24px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    padding: 12px 18px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;

    .icon-pet {
      width: 36px;
      height: 36px;
      background: #ccfbf1;
      color: #00796b;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .count {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }

    .sub {
      font-size: 11px;
      color: #64748b;
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
  return (
    <SectionWrapper>
      <ContentCol>
        <div className="category-tag">
          <SafetyCertificateFilled /> CÔNG NGHỆ THÚ Y THÔNG MINH TIÊN PHONG TẠI
          VIỆT NAM
        </div>

        <h1 className="main-heading">
          Chăm sóc toàn diện cho thú cưng với{' '}
          <span className="highlight">công nghệ chuẩn quốc tế</span>
        </h1>

        <p className="description">
          Hệ thống tích hợp 3 trong 1: Khám chữa bệnh & Hồ sơ điện tử, Dịch vụ
          Spa & Grooming cao cấp, Cửa hàng dinh dưỡng chính hãng.
        </p>

        <div className="btn-row">
          <Button
            type="primary"
            className="btn-booking"
            icon={<CalendarOutlined />}
            onClick={onScrollToBooking}
          >
            Đặt lịch khám ngay
          </Button>

          <Button
            className="btn-ai"
            icon={<ThunderboltOutlined />}
            onClick={onScrollToAi}
          >
            Hỏi nhanh trợ lý AI 24/7
          </Button>
        </div>

        <div className="features-strip">
          <div className="item">
            <CheckCircleFilled /> Bác sĩ &gt;10 năm kinh nghiệm
          </div>
          <div className="item">
            <CheckCircleFilled /> Xét nghiệm số hóa 15 phút
          </div>
          <div className="item">
            <CheckCircleFilled /> Cấp cứu xuyên đêm 24/7
          </div>
        </div>
      </ContentCol>

      <VisualCol>
        <div className="image-card">
          <img
            src="https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=800&q=80"
            alt="Bác sĩ thú y VCMOS khám cún cưng"
          />

          <div className="badge-top">
            <div className="dot" />
            <div>
              <strong>Hỗ trợ y tế 24/7</strong>
              <span>Luôn sẵn sàng túc trực</span>
            </div>
          </div>

          <div className="badge-bottom-left">
            <div className="icon-star">★</div>
            <div>
              <div className="rating">4.9/5 Xuất sắc</div>
              <div className="sub">&gt;3.200 đánh giá 5 sao từ phụ huynh</div>
            </div>
          </div>

          <div className="badge-bottom-right">
            <div className="icon-pet">🐾</div>
            <div>
              <div className="count">10.000+ bé thú cưng</div>
              <div className="sub">Theo dõi sức khỏe định kỳ</div>
            </div>
          </div>
        </div>
      </VisualCol>
    </SectionWrapper>
  );
};

export default HeroSection;
