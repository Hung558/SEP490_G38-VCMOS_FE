import React from 'react';
import styled from 'styled-components';
import { Button, Card, Row, Col, Typography, Space } from 'antd';
import {
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

const { Title, Paragraph } = Typography;

const HomeContainer = styled.div`
  min-height: calc(100vh - 72px);
  background: linear-gradient(180deg, #f8faff 0%, #ffffff 100%);
  padding: 60px 24px;
`;

const HeroSection = styled.div`
  max-width: 1100px;
  margin: 0 auto 60px auto;
  text-align: center;
  padding: 40px 20px;
`;

const StyledBadge = styled.span`
  display: inline-block;
  padding: 6px 16px;
  background: rgba(0, 25, 92, 0.08);
  color: #00195c;
  font-weight: 600;
  border-radius: 9999px;
  font-size: 13px;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
`;

const ContentGrid = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const FeatureCard = styled(Card)`
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 25, 92, 0.08);
    border-color: #cbd5e1;
  }

  .ant-card-body {
    padding: 32px 24px;
  }
`;

const IconCircle = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #f0f4ff;
  color: #00195c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 20px;
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLogin } = useIsLogin();

  return (
    <HomeContainer>
      <HeroSection>
        <StyledBadge>VCMOS Platform</StyledBadge>
        <Title
          level={1}
          style={{
            fontSize: '44px',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 16,
          }}
        >
          Hệ Thống Quản Lý Toàn Diện VCMOS
        </Title>
        <Paragraph
          style={{
            fontSize: '18px',
            color: '#64748b',
            maxWidth: '720px',
            margin: '0 auto 32px',
          }}
        >
          Giao diện Frontend chuẩn mực, hiệu năng cao được xây dựng trên nền
          tảng React 18, Vite, TypeScript và Ant Design.
        </Paragraph>
        <Space size="middle">
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            style={{
              height: '48px',
              padding: '0 32px',
              borderRadius: '10px',
              background: '#00195c',
            }}
            onClick={() => navigate(isLogin ? ROUTER.DASHBOARD : ROUTER.LOGIN)}
          >
            {isLogin ? 'Vào Bảng Điều Khiển' : 'Bắt Đầu Ngay'}
          </Button>
        </Space>
      </HeroSection>

      <ContentGrid>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <FeatureCard>
              <IconCircle>
                <RocketOutlined />
              </IconCircle>
              <Title level={4} style={{ color: '#0f172a', marginBottom: 12 }}>
                Hiệu Năng Vượt Trội
              </Title>
              <Paragraph style={{ color: '#64748b', lineHeight: 1.6 }}>
                Đóng gói với Vite 6, nạp mô-đun siêu tốc và tối ưu hóa dung
                lượng production bundle.
              </Paragraph>
            </FeatureCard>
          </Col>

          <Col xs={24} md={8}>
            <FeatureCard>
              <IconCircle>
                <SafetyCertificateOutlined />
              </IconCircle>
              <Title level={4} style={{ color: '#0f172a', marginBottom: 12 }}>
                Bảo Mật & Chuẩn Hóa
              </Title>
              <Paragraph style={{ color: '#64748b', lineHeight: 1.6 }}>
                Xác thực JWT an toàn kết nối trực tiếp với VCMOS Backend qua
                interceptors định dạng sẵn.
              </Paragraph>
            </FeatureCard>
          </Col>

          <Col xs={24} md={8}>
            <FeatureCard>
              <IconCircle>
                <ThunderboltOutlined />
              </IconCircle>
              <Title level={4} style={{ color: '#0f172a', marginBottom: 12 }}>
                Kiến Trúc Module Hóa
              </Title>
              <Paragraph style={{ color: '#64748b', lineHeight: 1.6 }}>
                Cấu trúc thư mục mạch lạc, sẵn sàng để mở rộng tính năng mới
                nhanh chóng và bền vững.
              </Paragraph>
            </FeatureCard>
          </Col>
        </Row>
      </ContentGrid>
    </HomeContainer>
  );
};

export default HomePage;
