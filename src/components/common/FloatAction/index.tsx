import { Space } from 'antd';
import styled from 'styled-components';
import './floatActionStyle.scss';
export const FloatActionWrapper = styled(Space)``;
const FloatAction = ({ ...rest }) => {
  return (
    <div className="float-action__wrapper" {...rest}>
      {rest.children}
    </div>
  );
};
export default FloatAction;
