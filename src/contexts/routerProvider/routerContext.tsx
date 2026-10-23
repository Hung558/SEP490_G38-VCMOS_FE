import { createContext, useContext, useMemo, useState } from 'react';

type RouterContextType = {
  routerBefore: string;
  setRouterBefore: (value: string) => void;
};

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider = ({ children }: { children: React.ReactNode }) => {
  const [routerBefore, setRouterBefore] = useState('');

  const value = useMemo(
    () => ({ routerBefore, setRouterBefore }),
    [routerBefore]
  );

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
};

export const useRouterContext = () => {
  const context = useContext(RouterContext);
  if (!context)
    throw new Error('useRouterContext must be used inside RouterProvider');
  return context;
};
