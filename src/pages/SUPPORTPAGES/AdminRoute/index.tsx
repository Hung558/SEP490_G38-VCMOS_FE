import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const AdminRoute = () => {
  const { user } = useAuth();
  const location = useLocation();
  const token = storage.getLocalStorage(STORAGE.TOKEN);
  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const role = String(
    effectiveUser?.role || effectiveUser?.systemRole || ''
  ).toLowerCase();

  if (!token && !effectiveUser) {
    return (
      <Navigate
        to={ROUTER.HOME}
        state={{ from: location, openLogin: true }}
        replace
      />
    );
  }

  if (role !== 'admin') {
    return <Navigate to={ROUTER.DASHBOARD} replace />;
  }

  return (
    <MainLayout type="common">
      <Outlet />
    </MainLayout>
  );
};

export default AdminRoute;
