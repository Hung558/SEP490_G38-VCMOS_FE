import { createContext, useContext, useMemo, useState } from 'react';

type CollapseMenuContextType = {
  collapseMenu: boolean;
  setCollapseMenu: React.Dispatch<React.SetStateAction<boolean>>;
};

const CollapseMenuContext = createContext<CollapseMenuContextType | undefined>(
  undefined
);

export const CollapseMenuProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [collapseMenu, setCollapseMenu] = useState<boolean>(false);

  const value = useMemo(
    () => ({ collapseMenu, setCollapseMenu }),
    [collapseMenu]
  );

  return (
    <CollapseMenuContext.Provider value={value}>
      {children}
    </CollapseMenuContext.Provider>
  );
};

export const useCollapseMenu = () => {
  const context = useContext(CollapseMenuContext);
  if (!context)
    throw new Error('CsecollapseMenu must be used inside CollapseMenuProvider');
  return context;
};
