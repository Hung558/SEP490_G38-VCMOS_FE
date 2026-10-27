import React from 'react';
import styled from 'styled-components';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import DoctorsSection from './components/DoctorsSection';
import CommunitySection from './components/CommunitySection';
import QuickBookingSection from './components/QuickBookingSection';

const HomePageWrapper = styled.div`
  min-height: 100vh;
  background-color: #fafbfc;
  color: #0f172a;
  overflow-x: hidden;
`;

const HomePage: React.FC = () => {
  const scrollToBooking = () => {
    const el = document.getElementById('quick-booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HomePageWrapper>
      {/* 1. Hero Section */}
      <HeroSection onScrollToBooking={scrollToBooking} />

      {/* 2. Hệ Sinh Thái Dịch Vụ Khép Kín */}
      <ServicesSection onSelectService={() => scrollToBooking()} />

      {/* 3. Đội Ngũ Bác Sĩ Thú Y Tận Tâm */}
      <DoctorsSection onSelectDoctor={() => scrollToBooking()} />

      {/* 4. Hành Trình Hồi Phục - Câu Chuyện Thật Từ Cộng Đồng */}
      <CommunitySection />

      {/* 5. Form Đặt Lịch Khám Ưu Tiên Nhanh */}
      <QuickBookingSection />
    </HomePageWrapper>
  );
};

export default HomePage;
