import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { getRoleGroup, normalizeRole, type RoleGroup } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import { getLandingPath } from '@/routerMap/roleAccess';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface RoleRouteProps {
  /** Role groups allowed on the child routes; anyone else goes to their own landing page */
  allow?: RoleGroup[];
  /** Exact normalized roles allowed on the child routes (e.g. ['Admin', 'Receptionist']) */
  allowRoles?: string[];
}

const RoleRoute = ({ allow, allowRoles }: RoleRouteProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const token = storage.getLocalStorage(STORAGE.TOKEN);
  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const rawRole = effectiveUser?.role || effectiveUser?.systemRole;
  const role = normalizeRole(rawRole);

  if (!token && !effectiveUser) {
    return (
      <Navigate
        to={ROUTER.HOME}
        state={{ from: location, openLogin: true }}
        replace
      />
    );
  }

  if (allowRoles && allowRoles.length > 0) {
    if (!allowRoles.includes(role)) {
      return <Navigate to={getLandingPath(rawRole)} replace />;
    }
  } else if (allow && allow.length > 0) {
    if (!allow.includes(getRoleGroup(rawRole))) {
      return <Navigate to={getLandingPath(rawRole)} replace />;
    }
  }

  return (
    <MainLayout type="common">
      <Outlet />
    </MainLayout>
  );
};

export default RoleRoute;
