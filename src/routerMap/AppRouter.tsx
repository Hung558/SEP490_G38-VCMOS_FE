import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';

import SpinCustom from '@/components/common/Spin';
import ROUTER from './ROUTER';

// Common Layout Wrappers
import PublicRouters from '@/pages/SUPPORTPAGES/PublicRouters';
import ProtectedRoute from '@/pages/SUPPORTPAGES/ProtectedRoute';
import NotFound from '@/pages/SUPPORTPAGES/NotFound';
import AdminRoute from '@/pages/SUPPORTPAGES/AdminRoute';
import RoleRoute from '@/pages/SUPPORTPAGES/RoleRoute';
import {
  EmailVerifyNoticeModal,
  EmailVerifyFloatingWidget,
} from '@/components/common/EmailVerifyReminder';

// Pages
import HomePage from '@/pages/Home';
import DashboardPage from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import LoginRegisterPage from '@/pages/ANONYMOUS/Login_Register';
import AdminUsersPage from '@/pages/AdminUsers';
import AdminServicesPage from '@/pages/AdminServices';
import AdminProductsPage from '@/pages/AdminProducts';
import PetProfilePage from '@/pages/PetProfile';
import CagesPage from '@/pages/Cages';
import AppointmentReceptionPage from '@/pages/AppointmentReception';
import StaffQueuePage from '@/pages/StaffQueue';
import ExamRecordPage from '@/pages/ExamRecord';

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
        {
          path: ROUTER.ADMIN_SERVICES,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AdminServicesPage />
            </Suspense>
          ),
        },
        {
          path: ROUTER.ADMIN_PRODUCTS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AdminProductsPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      // Cage management/viewing: Admin, Receptionist, Veterinarian, Groomer can access (BR-10, UC-27)
      element: (
        <RoleRoute
          allowRoles={['Admin', 'Receptionist', 'Veterinarian', 'Groomer']}
        />
      ),
      children: [
        {
          path: ROUTER.CAGES,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <CagesPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      // Clinic appointments intake: Admin and Receptionist only
      element: <RoleRoute allowRoles={['Admin', 'Receptionist']} />,
      children: [
        {
          path: ROUTER.CLINIC_APPOINTMENTS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AppointmentReceptionPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      // Work queue: the BE answers my-queue for Veterinarian and Groomer only
      element: <RoleRoute allowRoles={['Veterinarian', 'Groomer']} />,
      children: [
        {
          path: ROUTER.STAFF_QUEUE,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <StaffQueuePage />
            </Suspense>
          ),
        },
      ],
    },
    {
      // Start, save and complete a SOAP record are Veterinarian-only on the BE
      element: <RoleRoute allowRoles={['Veterinarian']} />,
      children: [
        {
          path: ROUTER.EXAM_RECORD,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <ExamRecordPage />
            </Suspense>
          ),
        },
      ],
    },

    {
      // Pet owner pages: staff and Admin own no pets here (GET /pets only
      // returns the signed-in user's pets), so they go to their landing page
      element: <RoleRoute allow={['owner']} />,
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
          path: ROUTER.PET_PROFILE,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <PetProfilePage />
            </Suspense>
          ),
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
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

  return (
    <>
      {elements}
      <EmailVerifyNoticeModal />
      <EmailVerifyFloatingWidget />
    </>
  );
};

export default AppRouter;
