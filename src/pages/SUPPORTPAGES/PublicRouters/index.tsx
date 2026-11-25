import HomeLayout from '@/components/layout/HomeLayout';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { usesCommunitySidebar } from '@/routerMap/roleAccess';
import ROUTER from '@/routerMap/ROUTER';
import { Outlet, useLocation } from 'react-router-dom';

function PublicRoutes() {
  const { user } = useAuth();
  const { isLogin } = useIsLogin();
  const { pathname } = useLocation();
  const inCommunity =
    pathname === ROUTER.COMMUNITY ||
    pathname.startsWith(`${ROUTER.COMMUNITY}/`);
  if (
    isLogin &&
    user &&
    inCommunity &&
    usesCommunitySidebar(user.role || user.systemRole)
  ) {
    return (
      <MainLayout>
        <Outlet />
      </MainLayout>
    );
  }
  return (
    <HomeLayout>
      <Outlet />
    </HomeLayout>
  );
}

export default PublicRoutes;
