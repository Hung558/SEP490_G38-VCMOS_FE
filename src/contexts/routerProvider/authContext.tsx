import { STORAGE, storage } from '@/lib/storage';
import type { Login } from '@/types';
import { createContext, useContext, useMemo, useState } from 'react';

type AuthContextType = {
  user: Login | null;
  login: (userData: Login) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<Login | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Login | null>(() => {
    if (typeof window === 'undefined') return null;
    return storage.getLocalStorage<Login>(STORAGE.USER_INFO);
  });

  const login = (userData: Login) => setUser(userData);
  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, setUser, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
