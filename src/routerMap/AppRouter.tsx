import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';

import SpinCustom from '@/components/common/Spin';
import ROUTER from './ROUTER';

// Common Layout Wrappers
import PublicRouters from '@/pages/SUPPORTPAGES/PublicRouters';
import ProtectedRoute from '@/pages/SUPPORTPAGES/ProtectedRoute';
import NotFound from '@/pages/SUPPORTPAGES/NotFound';
import AdminRoute from '@/pages/SUPPORTPAGES/AdminRoute';

// Pages
import HomePage from '@/pages/Home';
import DashboardPage from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import LoginRegisterPage from '@/pages/ANONYMOUS/Login_Register';
import AdminUsersPage from '@/pages/AdminUsers';

const AppRouter = () => {
  const elements = useRoutes([
    {
      path: ROUTER.HOME,
      element: <PublicRouters />,
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <HomePage />
            </Suspense>
          ),
        },
      ],
    },
    {
      path: ROUTER.LOGIN,
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <LoginRegisterPage />
        </Suspense>
      ),
    },
    {
      path: ROUTER.REGISTER,
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <LoginRegisterPage />
        </Suspense>
      ),
    },
    {
      path: ROUTER.FORGOT_PASSWORD,
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <LoginRegisterPage />
        </Suspense>
      ),
    },
    {
      element: <AdminRoute />,
      children: [
        {
          path: ROUTER.ADMIN_USERS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AdminUsersPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: ROUTER.DASHBOARD,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <DashboardPage />
            </Suspense>
          ),
        },
        {
          path: ROUTER.PROFILE,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <ProfilePage />
            </Suspense>
          ),
        },
      ],
    },
    {
      path: ROUTER.NOT_FOUND,
      element: <NotFound />,
    },
  ]);

  return elements;
};

export default AppRouter;
