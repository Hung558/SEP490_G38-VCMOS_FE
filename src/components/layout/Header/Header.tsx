import { useAuth } from '@/contexts/routerProvider/authContext';
import { useCollapseMenu } from '@/contexts/routerProvider/collapseMenuContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import ROUTER from '@/routerMap/ROUTER';
import { UserOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Col,
  Divider,
  Layout,
  Popover,
  Row,
  theme,
} from 'antd';
import { PanelLeftIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import MenuUser from './components/MenuUser';

const { Header } = Layout;
const HeaderTop = ({ ...rest }) => {
  const { isLogin } = useIsLogin();
  const { user } = useAuth();
  const { setCollapseMenu } = useCollapseMenu();

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  // Toggle sidebar collapse button
  const showSiderToggle = !!rest?.showSiderToggle;

  return (
    <Header
      style={{
        padding: '4px 24px',
        background: colorBgContainer,
        display: rest?.type ? 'flex' : 'none',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        height: '64px',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="d-flex-sb"
        style={{
          width: '100%',
          margin: '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          className="d-flex-start g-10"
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          {/* Logo/brand doubles as a "back to Home" link on every inner
              page — there was previously no way back to Home once a user
              left it (no back button, no Home item in the avatar menu). */}
          <Link
            to={ROUTER.HOME}
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: '#00195c',
              fontWeight: 800,
              fontSize: '16px',
              letterSpacing: '-0.01em',
              marginRight: '4px',
            }}
          >
            VCMOS
          </Link>
          <Divider
            type="vertical"
            style={{ borderColor: '#e2e8f0', margin: 0 }}
          />
          {showSiderToggle && (
            <>
              <Button
                type="text"
                icon={<PanelLeftIcon color="#475569" size={18} />}
                size="middle"
                onClick={() => setCollapseMenu(pre => !pre)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              />
              <Divider
                type="vertical"
                style={{ borderColor: '#e2e8f0', margin: 0 }}
              />
            </>
          )}
          <Breadcrumb />
        </div>
        {isLogin && (
          <Popover
            content={<MenuUser />}
            trigger="hover"
            placement="bottomRight"
          >
            <Row
              gutter={5}
              className="pointer account-infor-sumary-border"
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Col>
                <div
                  className="d-flex-end g-10"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <div
                    className="account-infor-sumary"
                    style={{ lineHeight: 1.2 }}
                  >
                    {!!user?.fullName && (
                      <div
                        className="account-infor-sumary-fullname"
                        style={{
                          textAlign: 'end',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontSize: '14px',
                        }}
                      >
                        {user.fullName}
                      </div>
                    )}
                    <div
                      className="account-infor-sumary-position"
                      style={{
                        textAlign: 'end',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {user?.username}
                    </div>
                  </div>
                  <Avatar
                    src={user?.avatar}
                    size={36}
                    className="style-avt"
                    icon={<UserOutlined />}
                    style={{
                      boxShadow: 'rgba(0, 0, 0, 0.08) 0px 2px 8px 1px',
                      border: '1.5px solid #e2e8f0',
                    }}
                  />
                </div>
              </Col>
            </Row>
          </Popover>
        )}
      </div>
    </Header>
  );
};

export default HeaderTop;
