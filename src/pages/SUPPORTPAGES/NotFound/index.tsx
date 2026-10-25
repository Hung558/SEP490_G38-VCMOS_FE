import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input } from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';

const PageContainer = styled.div`
  min-height: calc(100vh - 72px);
  background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 50%, #eff6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const ContentCard = styled.div`
  background: #ffffff;
  border-radius: 28px;
  max-width: 840px;
  width: 100%;
  padding: 56px 48px;
  box-shadow:
    0 25px 60px rgba(0, 77, 64, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(226, 232, 240, 0.8);
  text-align: center;
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    padding: 36px 20px;
  }
`;

const ErrorBadge = styled.div`
  display: inline-block;
  padding: 6px 18px;
  background: #e0f2f1;
  color: #00796b;
  font-size: 12px;
  font-weight: 700;
  border-radius: 9999px;
  letter-spacing: 0.8px;
  margin-bottom: 24px;
`;

const PuppyIllustration = styled.div`
  width: 140px;
  height: 140px;
  margin: 0 auto 20px auto;
  background: #fef3c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 70px;
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.2);
  position: relative;

  .stethoscope {
    position: absolute;
    bottom: -6px;
    right: 4px;
    background: #00796b;
    color: #ffffff;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    border: 3px solid #ffffff;
  }
`;

const BigNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 80px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 16px;

  .cross {
    width: 48px;
    height: 48px;
    background: #e0f2f1;
    color: #00796b;
    border: 3px solid #00796b;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 900;
  }
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #64748b;
  max-width: 580px;
  margin: 0 auto 32px auto;
  line-height: 1.6;
`;

const SearchContainer = styled.div`
  max-width: 580px;
  margin: 0 auto 32px auto;
  display: flex;
  gap: 8px;

  .ant-input-affix-wrapper {
    border-radius: 12px;
    padding: 10px 16px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
  }

  .search-btn {
    height: auto;
    padding: 0 24px;
    border-radius: 12px;
    background: #00695c;
    border-color: #00695c;
    font-weight: 600;
    &:hover {
      background: #004d40 !important;
      border-color: #004d40 !important;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 36px;

  .btn-home {
    background: #00695c;
    border-color: #00695c;
    color: #ffffff;
    height: 46px;
    padding: 0 24px;
    border-radius: 12px;
    font-weight: 700;
    &:hover {
      background: #004d40 !important;
      border-color: #004d40 !important;
    }
  }

  .btn-booking {
    background: #92400e;
    border-color: #92400e;
    color: #ffffff;
    height: 46px;
    padding: 0 24px;
    border-radius: 12px;
    font-weight: 700;
    &:hover {
      background: #78350f !important;
      border-color: #78350f !important;
    }
  }

  .btn-portal {
    background: #f0fdfa;
    border: 1.5px solid #ccfbf1;
    color: #0f766e;
    height: 46px;
    padding: 0 24px;
    border-radius: 12px;
    font-weight: 700;
    &:hover {
      background: #ccfbf1 !important;
      color: #115e59 !important;
    }
  }
`;

const EmergencyBox = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  max-width: 620px;
  margin: 0 auto;

  .left {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-plus {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fee2e2;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
    }

    .text {
      .tag {
        font-size: 11px;
        font-weight: 700;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .desc {
        font-size: 13px;
        color: #475569;
        margin: 2px 0 0 0;
      }
    }
  }

  .hotline {
    font-size: 16px;
    font-weight: 800;
    color: #00796b;
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    background: #ffffff;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;

    &:hover {
      color: #004d40;
      border-color: #00796b;
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 12px;
    text-align: center;
    .left {
      flex-direction: column;
    }
  }
`;

const QuickFooterLinks = styled.div`
  margin-top: 32px;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;

  a {
    color: #64748b;
    text-decoration: none;
    &:hover {
      color: #00796b;
      text-decoration: underline;
    }
  }
`;

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(
        `${ROUTER.HOME}?search=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

  return (
    <PageContainer>
      <ContentCard>
        <ErrorBadge>⚠️ LỖI ĐIỀU HƯỚNG 404</ErrorBadge>

        <PuppyIllustration>
          🐶
          <div className="stethoscope">🩺</div>
        </PuppyIllustration>

        <BigNumber>
          4<div className="cross">+</div>4
        </BigNumber>

        <Title>Gâu gâu! Chú cún đã tha mất trang này đi đâu rồi!</Title>
        <Subtitle>
          Trang bạn đang tìm kiếm có thể đã bị di chuyển, đổi tên hoặc đường dẫn
          tạm thời không còn tồn tại trong cơ sở dữ liệu phòng khám VCMOS.
        </Subtitle>

        <SearchContainer>
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Tìm dịch vụ, hướng dẫn chăm sóc thú cưng hoặc bác sĩ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button
            type="primary"
            size="large"
            className="search-btn"
            onClick={handleSearch}
          >
            Tìm kiếm &rarr;
          </Button>
        </SearchContainer>

        <ActionButtons>
          <Button
            type="primary"
            className="btn-home"
            icon={<HomeOutlined />}
            onClick={() => navigate(ROUTER.HOME)}
          >
            Trở về Trang chủ
          </Button>

          <Button
            className="btn-booking"
            icon={<CalendarOutlined />}
            onClick={() => navigate(ROUTER.HOME)}
          >
            Đặt lịch khám ngay
          </Button>

          <Button
            className="btn-portal"
            icon={<UserOutlined />}
            onClick={() => navigate(ROUTER.PROFILE)}
          >
            Cổng thông tin chủ nuôi
          </Button>
        </ActionButtons>

        <EmergencyBox>
          <div className="left">
            <div className="icon-plus">
              <PlusOutlined />
            </div>
            <div className="text">
              <div className="tag">Cần hỗ trợ y tế khẩn cấp?</div>
              <div className="desc">Lễ tân & Cấp cứu thú y VCMOS trực 24/7</div>
            </div>
          </div>
          <a href="tel:0902099905" className="hotline">
            <PhoneOutlined /> 0902.099.905
          </a>
        </EmergencyBox>

        <QuickFooterLinks>
          <a href={ROUTER.HOME}>Chuyên khoa khám</a>
          <span>•</span>
          <a href={ROUTER.HOME}>Tiêm phòng Vắc-xin</a>
          <span>•</span>
          <a href={ROUTER.HOME}>Cấp cứu lưu viện</a>
          <span>•</span>
          <a href={ROUTER.PROFILE}>Tra cứu hồ sơ bệnh án</a>
        </QuickFooterLinks>
      </ContentCard>
    </PageContainer>
  );
};

export default NotFound;
