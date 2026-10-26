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

const FormContainer = styled.div`
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  animation: fadeIn 0.35s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const FormHeader = styled.div`
  margin-bottom: 20px;

  h2 {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
    letter-spacing: -0.02em;
  }

  p {
    font-size: 13.5px;
    color: #64748b;
    margin: 0;
  }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 5px;
`;

const CustomFormItem = styled(Form.Item)`
  margin-bottom: 10px;

  .ant-input-affix-wrapper {
    background-color: #f8fafc !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 12px !important;
    padding: 8px 14px !important;
    font-size: 14px;
    box-shadow: none !important;
    transition: all 0.2s ease !important;

    &:hover {
      border-color: #94a3b8 !important;
      background-color: #f1f5f9 !important;
    }

    &-focused,
    &:focus {
      background-color: #ffffff !important;
      border-color: #0d9488 !important;
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15) !important;
    }
  }

  .ant-input {
    background-color: transparent !important;
    color: #0f172a;
    font-size: 14px;

    &::placeholder {
      color: #94a3b8;
    }
  }

  .ant-input-prefix {
    margin-right: 10px;
    color: #64748b;
    font-size: 15px;
  }

  .ant-input-password-icon {
    color: #64748b;

    &:hover {
      color: #0f172a;
    }
  }

  .ant-form-item-explain-error {
    font-size: 11.5px;
    margin-top: 2px;
    padding-left: 2px;
    color: #ef4444;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
  margin-bottom: 12px;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.38);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const DividerContainer = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e2e8f0;
  }

  span {
    padding: 0 14px;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  height: 42px;
  background-color: #ffffff;
  color: #334155;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

  &:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(1px);
  }
`;

interface RegisterFormProps {
  onToggleView: (registeredIdentifier?: string) => void;
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
        onToggleView(payload.phone);
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
      <FormContainer>
        <FormHeader>
          <h2>Tạo tài khoản thành viên mới</h2>
          <p>Trải nghiệm dịch vụ y tế & đặt lịch thông minh</p>
        </FormHeader>

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {/* Full Name */}
          <div>
            <FieldLabel>Họ và tên</FieldLabel>
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
                placeholder="Ví dụ: Nguyễn Văn An"
              />
            </CustomFormItem>
          </div>

          {/* Phone */}
          <div>
            <FieldLabel>Số điện thoại</FieldLabel>
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
                placeholder="Ví dụ: 0912345678"
              />
            </CustomFormItem>
          </div>

          {/* Email */}
          <div>
            <FieldLabel>Email (không bắt buộc)</FieldLabel>
            <CustomFormItem
              name="email"
              rules={[
                { required: false },
                { max: 100, message: 'Email tối đa 100 ký tự!' },
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Định dạng email không hợp lệ!',
                },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="Ví dụ: hotro@vcmos.vn"
              />
            </CustomFormItem>
          </div>

          {/* Password */}
          <div>
            <FieldLabel>Mật khẩu</FieldLabel>
            <CustomFormItem
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự!' },
                { max: 72, message: 'Mật khẩu tối đa 72 ký tự!' },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Tối thiểu 8 ký tự"
              />
            </CustomFormItem>
          </div>

          {/* Confirm Password */}
          <div>
            <FieldLabel>Xác nhận mật khẩu</FieldLabel>
            <CustomFormItem
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận lại mật khẩu!' },
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
                placeholder="Nhập lại mật khẩu"
              />
            </CustomFormItem>
          </div>

          <SubmitButton type="submit" disabled={loading}>
            Đăng ký ngay
          </SubmitButton>

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
        </Form>
      </FormContainer>
    </SpinCustom>
  );
};

export default RegisterForm;
