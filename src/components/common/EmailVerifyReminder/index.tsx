import { useAuth } from '@/contexts/routerProvider/authContext';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import UserService from '@/services/UserService';
import type { Login } from '@/types';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Modal, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const { Paragraph, Text } = Typography;

const VERIFY_HINT =
  'Xác minh email để dùng được Quên mật khẩu và Đổi mật khẩu khi cần.';

// Opens the Profile page, which starts the email verification flow
const useGoToVerifyEmail = () => {
  const navigate = useNavigate();
  return () => navigate(ROUTER.PROFILE, { state: { openVerifyEmail: true } });
};

const BadgeButton = styled(Button)`
  &.ant-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 9999px;
    border: 1px solid #fde68a;
    background: #fffbeb;
    color: #92400e;
    font-size: 13px;
    font-weight: 600;
  }

  &.ant-btn:hover {
    border-color: #f59e0b !important;
    background: #fef3c7 !important;
    color: #78350f !important;
  }

  @media (max-width: 768px) {
    .badge-label {
      display: none;
    }
  }
`;

/** Small reminder shown in headers while the account email is not verified. */
export const EmailVerifyBadge = () => {
  const { user } = useAuth();
  const goToVerify = useGoToVerifyEmail();

  if (!user || user.isEmailVerified !== false) return null;

  return (
    <Tooltip title={VERIFY_HINT}>
      <BadgeButton
        icon={<ExclamationCircleOutlined />}
        onClick={goToVerify}
        aria-label="Chưa xác minh email"
      >
        <span className="badge-label">Chưa xác minh email</span>
      </BadgeButton>
    </Tooltip>
  );
};

/**
 * Notice shown after each login until the account email is verified.
 * Closing it hides it for the rest of the session; the header badge stays.
 */
export const EmailVerifyNoticeModal = () => {
  const { user, setUser } = useAuth();
  const goToVerify = useGoToVerifyEmail();
  const [dismissed, setDismissed] = useState<boolean>(
    () => storage.getSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED) === true
  );

  // Sessions saved before isEmailVerified was stored at login: load it once
  const statusUnknown = !!user && typeof user.isEmailVerified !== 'boolean';
  useEffect(() => {
    if (!statusUnknown) return;
    UserService.getMyProfile()
      .then((res: any) => {
        const currentInfo = storage.getLocalStorage<Login>(STORAGE.USER_INFO);
        if (res?.user && currentInfo) {
          const updated = { ...currentInfo, ...res.user };
          storage.setLocalStorage(STORAGE.USER_INFO, updated);
          setUser(updated);
        }
      })
      .catch((err: any) => {
        console.error('Load email verification status error:', err);
      });
  }, [statusUnknown, setUser]);

  const dismiss = () => {
    storage.setSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED, true);
    setDismissed(true);
  };

  const handleVerify = () => {
    dismiss();
    goToVerify();
  };

  const hasEmail = !!user?.email;

  return (
    <Modal
      open={!!user && user.isEmailVerified === false && !dismissed}
      title="Xác minh email của bạn"
      onCancel={dismiss}
      footer={[
        <Button key="later" onClick={dismiss}>
          Để sau
        </Button>,
        <Button key="verify" type="primary" onClick={handleVerify}>
          {hasEmail ? 'Xác minh ngay' : 'Thêm email'}
        </Button>,
      ]}
    >
      <Paragraph>
        {hasEmail ? (
          <>
            Email <Text strong>{user?.email}</Text> chưa được xác minh. Hãy xác
            minh để dùng được chức năng Quên mật khẩu và Đổi mật khẩu khi cần.
          </>
        ) : (
          'Tài khoản của bạn chưa có email. Hãy thêm và xác minh email để dùng được chức năng Quên mật khẩu và Đổi mật khẩu khi cần.'
        )}
      </Paragraph>
      <Text type="secondary">
        Thông báo này sẽ hiện lại mỗi lần đăng nhập cho tới khi email được xác
        minh.
      </Text>
    </Modal>
  );
};
