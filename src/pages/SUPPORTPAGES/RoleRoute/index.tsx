import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { getRoleGroup, type RoleGroup } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import { getLandingPath } from '@/routerMap/roleAccess';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface RoleRouteProps {
  /** Role groups allowed on the child routes; anyone else goes to their own landing page */
  allow: RoleGroup[];
}

const RoleRoute = ({ allow }: RoleRouteProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const token = storage.getLocalStorage(STORAGE.TOKEN);
  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const role = effectiveUser?.role || effectiveUser?.systemRole;

  if (!token && !effectiveUser) {
    return (
      <Navigate
        to={ROUTER.HOME}
        state={{ from: location, openLogin: true }}
        replace
      />
    );
  }

  if (!allow.includes(getRoleGroup(role))) {
    return <Navigate to={getLandingPath(role)} replace />;
  }

  return (
    <MainLayout type="common">
      <Outlet />
    </MainLayout>
  );
};

export default RoleRoute;
