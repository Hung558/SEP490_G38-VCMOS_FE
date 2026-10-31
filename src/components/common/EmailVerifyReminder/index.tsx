import { useAuth } from '@/contexts/routerProvider/authContext';
import { STORAGE, storage } from '@/lib/storage';
import ROUTER from '@/routerMap/ROUTER';
import UserService from '@/services/UserService';
import type { Login } from '@/types';
import {
  ExclamationCircleOutlined,
  ExclamationCircleFilled,
  SafetyCertificateOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Modal, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const { Paragraph, Text } = Typography;

const VERIFY_HINT =
  'Xác minh email để dùng được tính năng Quên mật khẩu và Đổi mật khẩu khi cần.';

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
        icon={<ExclamationCircleOutlined style={{ color: '#f59e0b' }} />}
        onClick={goToVerify}
        aria-label="Chưa xác minh email"
      >
        <span className="badge-label">Chưa xác minh email</span>
      </BadgeButton>
    </Tooltip>
  );
};

const FloatingCornerContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1050;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1.5px solid #fde68a;
  border-left: 5px solid #f59e0b;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow:
    0 10px 25px -5px rgba(245, 158, 11, 0.2),
    0 8px 10px -6px rgba(0, 0, 0, 0.08);
  animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .corner-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .corner-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #92400e;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .corner-desc {
    font-size: 12px;
    color: #78350f;
    max-width: 320px;
  }

  .corner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 4px;
  }

  @media (max-width: 640px) {
    bottom: 12px;
    right: 12px;
    left: 12px;
    justify-content: space-between;
  }
`;

const CollapsedPill = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1050;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fffbeb;
  border: 1.5px solid #fde68a;
  padding: 8px 14px;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  transition: all 0.2s ease;

  &:hover {
    background: #fef3c7;
    border-color: #f59e0b;
    transform: translateY(-2px);
  }
`;

/**
 * Small persistent floating widget at bottom-right corner when modal is dismissed,
 * but email is still unverified. Disappears once email is verified.
 */
export const EmailVerifyFloatingWidget = () => {
  const { user } = useAuth();
  const goToVerify = useGoToVerifyEmail();
  const [collapsed, setCollapsed] = useState(false);

  // Read dismissed status from sessionStorage
  const [modalDismissed, setModalDismissed] = useState<boolean>(
    () => storage.getSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED) === true
  );

  useEffect(() => {
    const handleStorage = () => {
      setModalDismissed(
        storage.getSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED) === true
      );
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Poll sessionStorage occasionally in same-tab navigation
  useEffect(() => {
    const interval = setInterval(() => {
      const isDismissed =
        storage.getSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED) === true;
      if (isDismissed !== modalDismissed) {
        setModalDismissed(isDismissed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [modalDismissed]);

  if (!user || user.isEmailVerified !== false) return null;
  // Only show corner widget if modal was dismissed in this session
  if (!modalDismissed) return null;

  if (collapsed) {
    return (
      <Tooltip title="Nhấn để mở nhắc nhở xác minh email">
        <CollapsedPill onClick={() => setCollapsed(false)}>
          <ExclamationCircleFilled style={{ color: '#f59e0b', fontSize: 16 }} />
          <span>Chưa xác minh email</span>
        </CollapsedPill>
      </Tooltip>
    );
  }

  return (
    <FloatingCornerContainer>
      <div className="corner-content">
        <div className="corner-title">
          <ExclamationCircleFilled style={{ color: '#f59e0b', fontSize: 16 }} />
          <span>Chưa xác minh email</span>
        </div>
        <div className="corner-desc">
          Xác minh email để dùng được tính năng Quên & Đổi mật khẩu.
        </div>
      </div>
      <div className="corner-actions">
        <Button
          size="small"
          type="primary"
          style={{
            background: '#0d9488',
            borderColor: '#0d9488',
            fontWeight: 600,
          }}
          onClick={goToVerify}
        >
          Xác minh ngay
        </Button>
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined style={{ fontSize: 12, color: '#94a3b8' }} />}
          onClick={() => setCollapsed(true)}
          title="Thu gọn"
        />
      </div>
    </FloatingCornerContainer>
  );
};

/**
 * Notice shown after each login until the account email is verified.
 * Closing it hides it for the rest of the session; the header badge & floating corner stay.
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
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#92400e',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <SafetyCertificateOutlined
            style={{ color: '#0d9488', fontSize: 22 }}
          />
          <span>Xác minh tài khoản email</span>
        </div>
      }
      onCancel={dismiss}
      footer={[
        <Button key="later" onClick={dismiss}>
          Để sau
        </Button>,
        <Button
          key="verify"
          type="primary"
          style={{
            background: '#0d9488',
            borderColor: '#0d9488',
            fontWeight: 600,
          }}
          onClick={handleVerify}
        >
          {hasEmail ? 'Xác minh ngay' : 'Thêm email ngay'}
        </Button>,
      ]}
    >
      <Paragraph
        style={{
          fontSize: 14.5,
          lineHeight: 1.65,
          marginTop: 12,
          marginBottom: 14,
        }}
      >
        {hasEmail ? (
          <>
            Địa chỉ email{' '}
            <Text strong style={{ color: '#0d9488' }}>
              {user?.email}
            </Text>{' '}
            của bạn chưa được xác minh.
            <br />
            Bạn cần xác minh tài khoản email để tính năng{' '}
            <Text strong>“Quên mật khẩu”</Text> và{' '}
            <Text strong>“Đổi mật khẩu”</Text> hoạt động được nếu sau này nhỡ
            bạn quên mật khẩu.
          </>
        ) : (
          <>
            Tài khoản của bạn chưa có địa chỉ email liên kết.
            <br />
            Bạn cần cập nhật và xác minh email để tính năng{' '}
            <Text strong>“Quên mật khẩu”</Text> và{' '}
            <Text strong>“Đổi mật khẩu”</Text> hoạt động được nếu sau này nhỡ
            bạn quên mật khẩu.
          </>
        )}
      </Paragraph>
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12.5,
          color: '#64748b',
        }}
      >
        💡 Sau khi đóng bảng thông báo này, lời nhắc sẽ được thu gọn vào thanh
        Header và góc màn hình cho đến khi bạn hoàn tất xác minh.
      </div>
    </Modal>
  );
};
