import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import styled from 'styled-components';
import { toast } from 'sonner';
import UserService from '@/services/UserService';
import SpinCustom from '@/components/common/Spin';

const OverlayWrapper = styled.div`
  position: relative;
`;

interface GoogleLoginModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (userData: any) => void;
}

const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setLoading(true);
        // Send the Google access token to backend for verification
        const res: any = await UserService.googleLogin({
          googleAccessToken: tokenResponse.access_token,
        });

        if (res && res.data) {
          toast.success('Đăng nhập Google thành công!');
          onSuccess(res.data);
        }
      } catch (error: any) {
        console.error('Google login error:', error);
        const errorMsg =
          error?.response?.data?.error || 'Đăng nhập Google thất bại.';
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    onError: error => {
      console.error('Google OAuth error:', error);
      toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.');
      onCancel();
    },
  });

  // When the parent says "open", trigger Google login immediately
  React.useEffect(() => {
    if (open) {
      googleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!loading) return null;

  return (
    <OverlayWrapper>
      <SpinCustom spinning={loading}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Đang xác thực với Google...
        </div>
      </SpinCustom>
    </OverlayWrapper>
  );
};

export default GoogleLoginModal;
