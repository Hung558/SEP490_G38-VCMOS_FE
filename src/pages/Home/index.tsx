import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import DoctorsSection from './components/DoctorsSection';
import CommunitySection from './components/CommunitySection';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import ROUTER from '@/routerMap/ROUTER';

const HomePageWrapper = styled.div`
  min-height: 100vh;
  background-color: #fafbfc;
  color: #0f172a;
  overflow-x: hidden;
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLogin } = useIsLogin();

  const handleBookingNavigation = () => {
    if (!isLogin) {
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }
    navigate(`${ROUTER.DASHBOARD}?tab=appointments&book=new`);
  };

  return (
    <HomePageWrapper>
      {/* 1. Hero Section */}
      <HeroSection onScrollToBooking={handleBookingNavigation} />

      {/* 2. Hệ Sinh Thái Dịch Vụ Khép Kín */}
      <ServicesSection onSelectService={() => handleBookingNavigation()} />

      {/* 3. Đội Ngũ Bác Sĩ Thú Y Tận Tâm */}
      <DoctorsSection onSelectDoctor={() => handleBookingNavigation()} />

      {/* 4. Hành Trình Hồi Phục - Câu Chuyện Thật Từ Cộng Đồng */}
      <CommunitySection />
    </HomePageWrapper>
  );
};

export default HomePage;
