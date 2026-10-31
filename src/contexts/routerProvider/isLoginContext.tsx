import { STORAGE, storage } from '@/lib/storage';
import { createContext, useContext, useMemo, useState } from 'react';

type IsLoginContextType = {
  isLogin: string | null;
  setIsLogin: (value: string) => void;
};

const IsLoginContext = createContext<IsLoginContextType | undefined>(undefined);

export const IsLoginProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLogin, setIsLogin] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return storage.getLocalStorage<string>(STORAGE.TOKEN);
  });

  const value = useMemo(() => ({ isLogin, setIsLogin }), [isLogin]);

  return (
    <IsLoginContext.Provider value={value}>{children}</IsLoginContext.Provider>
  );
};

export const useIsLogin = () => {
  const context = useContext(IsLoginContext);
  if (!context) throw new Error('useLogin must be used inside IsLoginProvider');
  return context;
};
