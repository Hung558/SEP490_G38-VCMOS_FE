import React, { useState } from 'react';
import SpinCustom from '@/components/common/Spin';
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Form, Input } from 'antd';
import UserService from '@/services/UserService';
import styled from 'styled-components';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { STORAGE, storage } from '@/lib/storage';
import type { Login } from '@/types';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { useGoogleLogin } from '@react-oauth/google';

const FormCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  padding: 48px;
  width: 100%;
  max-width: 440px;
  box-shadow:
    0 20px 60px rgba(0, 25, 92, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.6);
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @keyframes slideUpFade {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    padding: 32px 24px;
  }
`;

const HelloTitle = styled.h2`
  font-size: 32px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.8px;
  text-align: left;
`;

const WelcomeTitle = styled.h2`
  font-size: 32px;
  font-weight: 900;
  color: #0d9488;
  margin: 0 0 32px 0;
  letter-spacing: -0.8px;
  text-align: left;
`;

const CustomFormItem = styled(Form.Item)`
  margin-bottom: 20px;

  .ant-input-affix-wrapper,
  & > .ant-input {
    background-color: #f8fafc !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    font-size: 15px;
    box-shadow: none !important;
    transition: all 0.2s ease !important;

    &:hover {
      border-color: #cbd5e1 !important;
      background-color: #f1f5f9 !important;
    }

    &-focused,
    &:focus,
    &:focus-within {
      background-color: #ffffff !important;
      border-color: #0d9488 !important;
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15) !important;
    }
  }

  .ant-input-affix-wrapper .ant-input {
    background-color: transparent !important;
    border: none !important;
    padding: 0 !important;
    color: #0f172a;
    font-size: 15px;

    &::placeholder {
      color: #94a3b8;
    }
  }

  .ant-input {
    color: #0f172a;
    &::placeholder {
      color: #94a3b8;
    }
  }

  .ant-input-prefix {
    margin-right: 10px;
    color: #64748b;
    font-size: 16px;
  }

  .ant-input-password-icon {
    color: #64748b;

    &:hover {
      color: #0f172a;
    }
  }

  .ant-form-item-explain-error {
    font-size: 12.5px;
    margin-top: 4px;
    padding-left: 4px;
    color: #ef4444;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 50px;
  background: #0d9488;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);

  &:hover {
    background: #0f766e;
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const DividerContainer = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e2e8f0;
  }

  span {
    padding: 0 16px;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  height: 52px;
  background-color: #ffffff;
  color: #334155;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
  margin-bottom: 28px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  &:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }
`;

const FooterText = styled.div`
  text-align: center;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;

  a {
    color: #0d9488;
    text-decoration: none;
    font-weight: 700;
    margin-left: 4px;

    &:hover {
      color: #0f766e;
      text-decoration: underline;
    }
  }
`;

interface RegisterFormProps {
  onToggleView: () => void;
  onNeedsVerification: (email: string) => void;
  onNeedsProfileCompletion: (profile: {
    googleAccessToken: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onToggleView,
  onNeedsVerification: _onNeedsVerification,
  onNeedsProfileCompletion,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const { setIsLogin } = useIsLogin();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const googleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setLoading(true);
        const res: any = await UserService.googleLogin({
          googleAccessToken: tokenResponse.access_token,
        });

        if (res && res.needsProfileCompletion) {
          onNeedsProfileCompletion({
            googleAccessToken: tokenResponse.access_token,
            email: res.data.email,
            fullName: res.data.fullName,
            avatarUrl: res.data.avatarUrl,
          });
        } else if (res && res.data) {
          toast.success('Đăng nhập Google thành công!');
          handleLoginSuccess(res.data);
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
      toast.error(
        'Đăng nhập Google thất bại. Vui lòng kiểm tra cấu hình tài khoản Google.'
      );
    },
    onNonOAuthError: error => {
      console.error('Google Non-OAuth error:', error);
      toast.error(
        'Kết nối Google thất bại. Vui lòng kiểm tra chặn popup hoặc quyền truy cập cookie của trình duyệt.'
      );
    },
  });

  const handleLoginSuccess = (data: any) => {
    const rawUser = data.user || data.userInfo || data;
    const token = data.token || '';

    const loginInfo: Login = {
      _id: rawUser._id,
      token: token,
      expiredAt: data.expiredAt || Date.now() + 24 * 60 * 60 * 1000,
      username: rawUser.username || rawUser.phone || '',
      fullName: rawUser.fullName || '',
      phone: rawUser.phone,
      email: rawUser.email,
      avatar: rawUser.avatar || '',
      systemRole: rawUser.systemRole || rawUser.role || 'user',
      role: rawUser.role || 'user',
    };

    storage.setLocalStorage(STORAGE.TOKEN, loginInfo.token);
    storage.setLocalStorage(STORAGE.USER_INFO, JSON.stringify(loginInfo));
    setIsLogin(STORAGE.TOKEN);
    setUser(loginInfo);

    navigate(ROUTER.DASHBOARD);
  };

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);
      const payload = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email ? values.email.trim() : undefined,
        password: values.password,
      };

      const res: any = await UserService.register(payload);

      if (res) {
        toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        form.resetFields();
        onToggleView();
      }
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại thông tin!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpinCustom spinning={loading}>
      <FormCard>
        <HelloTitle>Tạo mới</HelloTitle>
        <WelcomeTitle>Tài khoản.</WelcomeTitle>

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {/* Full Name */}
          <CustomFormItem
            name="fullName"
            rules={[
              { required: true, message: 'Vui lòng nhập họ và tên!' },
              { max: 100, message: 'Họ và tên tối đa 100 ký tự!' },
            ]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Họ và tên"
            />
          </CustomFormItem>

          {/* Phone */}
          <CustomFormItem
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              {
                pattern: /^0\d{9}$/,
                message: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0!',
              },
            ]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              placeholder="Số điện thoại"
            />
          </CustomFormItem>

          {/* Email */}
          <CustomFormItem
            name="email"
            rules={[
              { required: false },
              { max: 100, message: 'Email tối đa 100 ký tự!' },
              {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Định dạng email không đúng!',
              },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="Email (không bắt buộc)"
            />
          </CustomFormItem>

          {/* Password */}
          <CustomFormItem
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự!' },
              { max: 50, message: 'Mật khẩu tối đa 50 ký tự!' },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            />
          </CustomFormItem>

          {/* Confirm Password */}
          <CustomFormItem
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Mật khẩu xác nhận không trùng khớp!')
                  );
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Xác nhận lại mật khẩu"
            />
          </CustomFormItem>

          <SubmitButton type="submit">Đăng ký tài khoản</SubmitButton>

          <DividerContainer>
            <span>Hoặc tiếp tục với</span>
          </DividerContainer>

          <GoogleButton type="button" onClick={() => googleLogin()}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              style={{ display: 'block' }}
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.6z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.58-5.05-3.7H.95v2.33C2.43 15.89 5.48 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.97H.95C.34 6.18 0 7.55 0 9s.34 2.82.95 4.03l3-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4C13.46.96 11.42 0 9 0 5.48 0 2.43 2.11.95 4.97l3 2.33c.71-2.12 2.7-3.7 5.05-3.7z"
              />
            </svg>
            Đăng ký với Google
          </GoogleButton>

          <FooterText>
            Đã có tài khoản?{' '}
            <a
              href="#login"
              onClick={e => {
                e.preventDefault();
                onToggleView();
              }}
            >
              Đăng nhập ngay!
            </a>
          </FooterText>
        </Form>
      </FormCard>
    </SpinCustom>
  );
};

export default RegisterForm;
