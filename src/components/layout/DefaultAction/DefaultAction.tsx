import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { STORAGE, storage } from '@/lib/storage';
import type { Login } from '@/types';
import { useEffect } from 'react';

const DefaultAction = () => {
  const { setIsLogin } = useIsLogin();
  const { setUser } = useAuth();
  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');
    if (!hasLoadedBefore) {
      storage.deleteLocalStorage(STORAGE.TOKEN);
      storage.deleteLocalStorage(STORAGE.USER_INFO);
      sessionStorage.setItem('hasLoadedBefore', 'true');
      return;
    }

    const userInfo = storage.getLocalStorage<Login>(STORAGE.USER_INFO);
    if (!userInfo) return;

    try {
      setIsLogin(STORAGE.TOKEN);
      setUser(userInfo);
    } catch (e) {
      console.error('Lỗi parse USER:', e);
    }
  }, []);
  return <></>;
};

export default DefaultAction;
