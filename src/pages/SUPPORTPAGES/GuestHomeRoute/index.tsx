import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { canVisitHomepage, getLandingPath } from '@/routerMap/roleAccess';

// Guests and pet owners may view the homepage; clinic staff use their workspace.
const GuestHomeRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isLogin } = useIsLogin();

  if (isLogin && user && !canVisitHomepage(user.role || user.systemRole)) {
    return (
      <Navigate to={getLandingPath(user.role || user.systemRole)} replace />
    );
  }

  return <>{children}</>;
};

export default GuestHomeRoute;
