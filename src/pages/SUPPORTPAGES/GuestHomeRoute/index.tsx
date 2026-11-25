import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { getLandingPath } from '@/routerMap/roleAccess';

// Only the homepage is guest-only; community routes remain public to all roles.
const GuestHomeRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isLogin } = useIsLogin();

  if (isLogin && user) {
    return (
      <Navigate to={getLandingPath(user.role || user.systemRole)} replace />
    );
  }

  return <>{children}</>;
};

export default GuestHomeRoute;
