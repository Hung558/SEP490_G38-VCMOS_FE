import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

function ProtectedRoute() {
  const { user } = useAuth();
  const token = storage.getLocalStorage(STORAGE.TOKEN);
  const location = useLocation();

  if (!token && !user) {
    return (
      <Navigate
        to={ROUTER.HOME}
        state={{ from: location, openLogin: true }}
        replace
      />
    );
  }

  return (
    <MainLayout type="common">
      <Outlet />
    </MainLayout>
  );
}

export default ProtectedRoute;
