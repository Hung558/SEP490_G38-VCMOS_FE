import React, { useState, useEffect } from 'react';
import SpinCustom from '@/components/common/Spin';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { STORAGE, storage } from '@/lib/storage';
import type { Login } from '@/types';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import UserService from '@/services/UserService';
import styled from 'styled-components';
import ROUTER from '@/routerMap/ROUTER';
import { toast } from 'sonner';

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
  margin-bottom: 24px;

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
  margin-bottom: 6px;
`;

const CustomFormItem = styled(Form.Item)`
  margin-bottom: 18px;

  .ant-input-affix-wrapper {
    background-color: #f8fafc !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 12px !important;
    padding: 11px 16px !important;
    font-size: 14.5px;
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
    font-size: 14.5px;

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
    font-size: 12px;
    margin-top: 4px;
    padding-left: 2px;
    color: #ef4444;
  }
`;

const ForgotPasswordLink = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
  margin-bottom: 22px;

  a {
    color: #0d9488;
    font-size: 13px;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;

    &:hover {
      color: #0f766e;
      text-decoration: underline;
    }
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 18px;
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

interface LoginFormProps {
  onToggleView: () => void;
  onForgotPassword: () => void;
  onNeedsVerification: (email: string) => void;
  initialIdentifier?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  initialIdentifier,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const { setIsLogin } = useIsLogin();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialIdentifier) {
      form.setFieldsValue({ identifier: initialIdentifier });
    }
  }, [initialIdentifier, form]);

  const handleLoginSuccess = (data: any) => {
    const rawUser = data.user || data.userInfo || data;
    const token = data.token || '';

    const loginInfo: Login = {
      _id: rawUser._id,
      code: rawUser.code,
      token: token,
      expiredAt: data.expiredAt || Date.now() + 24 * 60 * 60 * 1000,
      username: rawUser.username || rawUser.phone || '',
      fullName: rawUser.fullName || '',
      phone: rawUser.phone,
      email: rawUser.email,
      isEmailVerified: rawUser.isEmailVerified === true,
      systemRole: rawUser.systemRole || rawUser.role || 'user',
      role: rawUser.role || 'user',
      status: rawUser.status,
    };

    storage.setLocalStorage(STORAGE.TOKEN, loginInfo.token);
    storage.setLocalStorage(STORAGE.USER_INFO, JSON.stringify(loginInfo));
    // Every new login shows the "verify your email" notice again
    storage.deleteSessionStorage(STORAGE.EMAIL_NOTICE_DISMISSED);
    setIsLogin(STORAGE.TOKEN);
    setUser(loginInfo);

    toast.success('Đăng nhập thành công!');
    navigate(ROUTER.DASHBOARD);
  };

  const onSubmit = async (formData: {
    identifier: string;
    password: string;
  }) => {
    try {
      setLoading(true);
      const res: any = await UserService.login({
        identifier: formData.identifier.trim(),
        password: formData.password,
      } as any);

      if (res) {
        handleLoginSuccess(res.data || res);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Đăng nhập thất bại. Vui lòng kiểm tra số điện thoại/email hoặc mật khẩu!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpinCustom spinning={loading}>
      <FormContainer>
        <FormHeader>
          <h2>Đăng nhập để bắt đầu phiên làm việc</h2>
          <p>An toàn, nhanh chóng và dễ dàng</p>
        </FormHeader>

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <div>
            <FieldLabel>Email ID / Số điện thoại</FieldLabel>
            <CustomFormItem
              name="identifier"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập số điện thoại hoặc email!',
                },
                { max: 100, message: 'Tối đa 100 ký tự!' },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Nhập số điện thoại hoặc email"
              />
            </CustomFormItem>
          </div>

          <div>
            <FieldLabel>Mật khẩu</FieldLabel>
            <CustomFormItem
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { max: 72, message: 'Mật khẩu tối đa 72 ký tự!' },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu của bạn"
              />
            </CustomFormItem>
          </div>

          <ForgotPasswordLink>
            <a
              href="#forgot"
              onClick={e => {
                e.preventDefault();
                onForgotPassword();
              }}
            >
              Quên mật khẩu?
            </a>
          </ForgotPasswordLink>

          <SubmitButton type="submit" disabled={loading}>
            Đăng nhập
          </SubmitButton>
        </Form>
      </FormContainer>
    </SpinCustom>
  );
};

export default LoginForm;
