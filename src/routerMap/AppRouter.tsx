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
import AdminReportsPage from '@/pages/AdminReports';
import FrontDeskDashboardPage from '@/pages/FrontDeskDashboard';
import PetProfilePage from '@/pages/PetProfile';
import PetJourneysPage from '@/pages/PetJourneys';
import CagesPage from '@/pages/Cages';
import AppointmentReceptionPage from '@/pages/AppointmentReception';
import StaffQueuePage from '@/pages/StaffQueue';
import StaffSchedulesPage from '@/pages/StaffSchedules';
import ExamRecordPage from '@/pages/ExamRecord';
import InpatientCarePage from '@/pages/InpatientCare';
import MyInvoicesPage from '@/pages/MyInvoices';
import CommunityPostsPage from '@/pages/CommunityPosts';
import CommunityPage from '@/pages/Community';
import CommunityPostDetailPage from '@/pages/CommunityPostDetail';
import AdminCommunityModerationPage from '@/pages/AdminCommunityModeration';
import ClinicInvoicesPage from '@/pages/ClinicInvoices';
import VnpayReturnPage from '@/pages/VnpayReturn';
import { useScrollTopOnNavigate } from '@/hooks/Common/useScrollTopOnNavigate';

const AppRouter = () => {
  useScrollTopOnNavigate();
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
        {
          // Public feed: guests and every role read Published posts
          path: ROUTER.COMMUNITY,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <CommunityPage />
            </Suspense>
          ),
        },
        {
          path: ROUTER.COMMUNITY_POST,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <CommunityPostDetailPage />
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
      // Whoever paid lands here from VNPay, signed in or not
      path: ROUTER.VNPAY_RETURN,
      element: (
        <Suspense fallback={<SpinCustom spinning={true} />}>
          <VnpayReturnPage />
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
        {
          path: ROUTER.ADMIN_REPORTS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AdminReportsPage />
            </Suspense>
          ),
        },
        {
          path: ROUTER.ADMIN_COMMUNITY_MODERATION,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AdminCommunityModerationPage />
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
          path: ROUTER.FRONT_DESK_DASHBOARD,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <FrontDeskDashboardPage />
            </Suspense>
          ),
        },
        {
          path: ROUTER.CLINIC_APPOINTMENTS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <AppointmentReceptionPage />
            </Suspense>
          ),
        },
        {
          // GET /invoices is Receptionist and Admin; only the receptionist takes payment
          path: ROUTER.CLINIC_INVOICES,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <ClinicInvoicesPage />
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
      // SCR-30 (nghiệp vụ 7.4, UC-67, SRS permission matrix): Admin manages the
      // shifts, Receptionist views all, Veterinarian/Groomer view their own
      element: (
        <RoleRoute
          allowRoles={['Admin', 'Receptionist', 'Veterinarian', 'Groomer']}
        />
      ),
      children: [
        {
          path: ROUTER.STAFF_SCHEDULES,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <StaffSchedulesPage />
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
          path: ROUTER.INPATIENT_CARE,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <InpatientCarePage />
            </Suspense>
          ),
        },
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
      element: <RoleRoute allowRoles={['PetOwner']} />,
      children: [
        {
          path: ROUTER.PET_JOURNEYS,
          element: <PetJourneysPage />,
        },
        {
          path: ROUTER.MY_COMMUNITY_POSTS,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <CommunityPostsPage />
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
          // GET /invoices/me is PetOwner only (SCR-15)
          path: ROUTER.MY_INVOICES,
          element: (
            <Suspense fallback={<SpinCustom spinning={true} />}>
              <MyInvoicesPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      // Hồ sơ pet: chủ nuôi xem pet của mình; bác sĩ và groomer chỉ xem, để mở
      // timeline và bệnh án các lần trước (nghiệp vụ 5, 6)
      element: (
        <RoleRoute allow={['owner']} allowRoles={['Veterinarian', 'Groomer']} />
      ),
      children: [
        {
          path: ROUTER.PET_JOURNEY,
          element: <PetJourneysPage />,
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
