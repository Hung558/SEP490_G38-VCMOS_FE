import { Spin } from 'antd';
const SpinCustom = ({ ...rest }) => {
  // const spinIcon = <LoadingOverlay isLoadingTable sizeSmall />;
  return (
    <Spin
      {...rest}
      // indicator={spinIcon}
    />
  );
};
export default SpinCustom;
