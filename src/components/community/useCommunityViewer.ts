import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { normalizeRole } from '@/constants/roles';
import { canInteractInCommunity } from '@/services/CommunityService';

/**
 * Who is reading the community: guests and clinic staff only read; a pet owner
 * also likes, comments, replies, reports and shares (BE: PetOwner only).
 */
export const useCommunityViewer = () => {
  const { user } = useAuth();
  const { isLogin } = useIsLogin();
  const role = user?.role || user?.systemRole;
  const signedIn = Boolean(isLogin && user);
  return {
    signedIn,
    userId: signedIn ? user?._id : undefined,
    role: signedIn ? role : undefined,
    canInteract: signedIn && canInteractInCommunity(role),
    isAdmin: signedIn && normalizeRole(role) === 'Admin',
  };
};
