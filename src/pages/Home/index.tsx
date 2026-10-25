import React from 'react';
import styled from 'styled-components';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import AiAssessmentSection from './components/AiAssessmentSection';
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

  const scrollToAi = () => {
    const el = document.getElementById('ai-assistant');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HomePageWrapper>
      {/* 1. Hero Section */}
      <HeroSection
        onScrollToBooking={scrollToBooking}
        onScrollToAi={scrollToAi}
      />

      {/* 2. Hệ Sinh Thái Dịch Vụ Khép Kín */}
      <ServicesSection onSelectService={() => scrollToBooking()} />

      {/* 3. Trợ Lý Ảo AI Sàng Lọc Sơ Bộ */}
      <AiAssessmentSection onBookAppointment={scrollToBooking} />

      {/* 4. Đội Ngũ Bác Sĩ Thú Y Tận Tâm */}
      <DoctorsSection onSelectDoctor={() => scrollToBooking()} />

      {/* 5. Hành Trình Hồi Phục - Câu Chuyện Thật Từ Cộng Đồng */}
      <CommunitySection />

      {/* 6. Form Đặt Lịch Khám Ưu Tiên Nhanh */}
      <QuickBookingSection />
    </HomePageWrapper>
  );
};

export default HomePage;
