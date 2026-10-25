import { Tooltip } from 'antd';
import { Link } from 'react-router-dom';

const LinkCusstom = ({ ...rest }) => {
  return (
    <Tooltip
      title={rest.children}
      placement="right"
      //   color={'cyan'}
      mouseEnterDelay={0.8}
    >
      <Link to={rest.to} {...rest}>
        {rest.children}
      </Link>
    </Tooltip>
  );
};

export default LinkCusstom;
