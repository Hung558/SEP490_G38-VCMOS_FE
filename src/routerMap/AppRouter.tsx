import React, { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';

import SpinCustom from '@/components/common/Spin';
import ROUTER from './ROUTER';

// Common Layout Wrappers
const PublicRouters = React.lazy(
  () => import('@/pages/SUPPORTPAGES/PublicRouters')
);
const ProtectedRoute = React.lazy(
  () => import('@/pages/SUPPORTPAGES/ProtectedRoute')
);
const NotFound = React.lazy(() => import('@/pages/SUPPORTPAGES/NotFound'));

// Pages
const HomePage = React.lazy(() => import('@/pages/Home'));
const DashboardPage = React.lazy(() => import('@/pages/Dashboard'));
const ProfilePage = React.lazy(() => import('@/pages/Profile'));

const AppRouter = () => {
  const elements = useRoutes([
    {
      path: ROUTER.HOME,
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <PublicRouters />
        </Suspense>
      ),
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
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <ProtectedRoute />
        </Suspense>
      ),
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
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <NotFound />
        </Suspense>
      ),
    },
  ]);

  return elements;
};

export default AppRouter;
