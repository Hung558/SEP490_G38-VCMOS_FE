import React from 'react';

const layoutStyled: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
};

const LayoutAdminCommon = ({
  children,
  ...rest
}: React.PropsWithChildren<unknown>) => {
  return (
    <div style={layoutStyled}>
      <div
        className="content"
        style={{ width: '100%', padding: '12px 24px' }}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
};

export default LayoutAdminCommon;
