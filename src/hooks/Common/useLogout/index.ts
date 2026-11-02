import { useCallback } from 'react';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import AuthService from '@/services/AuthService';

/** Signs the user out: tells the BE, clears the saved session, reloads on the home page */
export const useLogout = () => {
  const { setIsLogin } = useIsLogin();
  const { setUser } = useAuth();

  return useCallback(async () => {
    try {
      // Called before clearing storage so the request still carries the token
      await AuthService.logout();
    } catch {
      // The BE keeps no session (stateless JWT), so a failed call must not
      // stop the user from signing out
    }
    storage.clearLocalStorage();
    // The next login should show the "verify your email" notice again
    storage.deleteSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED);
    setIsLogin('');
    setUser(null);
    window.location.href = ROUTER.HOME;
  }, [setIsLogin, setUser]);
};
