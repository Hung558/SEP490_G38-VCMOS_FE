import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import DoctorsSection from './components/DoctorsSection';
import CommunitySection from './components/CommunitySection';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { getBookingPath, getLandingPath } from '@/routerMap/roleAccess';

const HomePageWrapper = styled.div`
  min-height: 100vh;
  background-color: #fafbfc;
  color: #0f172a;
  overflow-x: hidden;
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLogin } = useIsLogin();
  const { user } = useAuth();

  // The header's section links open the home page from other pages (e.g. the
  // community page) with the section to show. Scroll once more after the
  // sections above have loaded their data and grown.
  const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
  useEffect(() => {
    if (!scrollTo) return;
    const scroll = () =>
      document
        .getElementById(scrollTo)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timers = [100, 800].map(delay => window.setTimeout(scroll, delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [scrollTo, location.key]);

  // serviceId: "Đặt dịch vụ này" on a service card, pre-selected in the form
  const handleBookingNavigation = (serviceId?: string) => {
    if (!isLogin) {
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }
    // Roles that cannot book go to their own working page, as /dashboard would
    // redirect them anyway
    const role = user?.role || user?.systemRole;
    navigate(getBookingPath(role, serviceId) ?? getLandingPath(role));
  };

  // Community posts are shown to every role; guests and clinic staff only
  // read them (decision of 21/11, beyond nghiệp vụ 2: K1 kept)
  return (
    <HomePageWrapper>
      {/* 1. Hero Section */}
      <HeroSection onScrollToBooking={() => handleBookingNavigation()} />

      {/* 2. Hệ Sinh Thái Dịch Vụ Khép Kín */}
      <ServicesSection onSelectService={handleBookingNavigation} />

      {/* 3. Đội Ngũ Bác Sĩ Thú Y Tận Tâm (no booking with a chosen vet) */}
      <DoctorsSection />

      {/* 4. Cộng đồng: newest Published posts, two tabs (nghiệp vụ 3.4) */}
      <CommunitySection />
    </HomePageWrapper>
  );
};

export default HomePage;
