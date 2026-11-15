import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { getRoleGroup, normalizeRole, type RoleGroup } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import { getLandingPath } from '@/routerMap/roleAccess';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface RoleRouteProps {
  /**
   * Role groups allowed on the child routes; anyone else goes to their own
   * landing page. With `allowRoles` too, either one lets the user in.
   */
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

  const restricted = Boolean(allowRoles?.length || allow?.length);
  const allowed =
    Boolean(allowRoles?.includes(role)) ||
    Boolean(allow?.includes(getRoleGroup(rawRole)));
  if (restricted && !allowed) {
    return <Navigate to={getLandingPath(rawRole)} replace />;
  }

  return (
    <MainLayout type="common">
      <Outlet />
    </MainLayout>
  );
};

export default RoleRoute;
