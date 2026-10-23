import React, { useState } from 'react';
import SpinCustom from '@/components/common/Spin';
import {
  MailOutlined,
  LockOutlined,
  KeyOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Form, Input } from 'antd';
import styled from 'styled-components';
import { toast } from 'sonner';
import UserService from '@/services/UserService';

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
  color: #00a2c7;
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
      border-color: #00a2c7 !important;
      box-shadow: 0 0 0 3px rgba(0, 162, 199, 0.12) !important;
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
  height: 52px;
  background: linear-gradient(135deg, #00a2c7 0%, #008bb0 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 162, 199, 0.25);

  &:hover {
    background: linear-gradient(135deg, #00b5de 0%, #009cc7 100%);
    box-shadow: 0 6px 20px rgba(0, 162, 199, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(0, 162, 199, 0.2);
  }
`;

const FooterText = styled.div`
  text-align: center;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;

  a {
    color: #00a2c7;
    text-decoration: none;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
`;

interface ForgotPasswordFormProps {
  onToggleView: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onToggleView,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>('');
  const [form] = Form.useForm();

  // Yêu cầu mã OTP / Token
  const onRequestReset = async (values: { email: string }) => {
    try {
      setLoading(true);
      const emailVal = values.email.trim();
      setEmail(emailVal);

      const res: any = await UserService.forgotPassword({
        email: emailVal,
      });

      if (res && res.devToken) {
        // DEV mode: hiển thị token cho testing
        toast.success(`Mã OTP: ${res.devToken} (DEV mode)`);
      } else {
        toast.success('Mã OTP khôi phục mật khẩu đã được gửi đến email!');
      }
      setStep(2);
    } catch (error: any) {
      console.log('error>>ForgotPasswordFormRequest>>:', error);
      const errorMsg =
        error?.response?.data?.error ||
        'Gửi yêu cầu thất bại. Vui lòng thử lại!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Đặt lại mật khẩu mới với Token và Password
  const onResetPassword = async (values: any) => {
    try {
      setLoading(true);

      await UserService.resetPassword({
        email,
        token: values.token.trim(),
        newPassword: values.password,
      });

      toast.success(
        'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.'
      );
      form.resetFields();
      onToggleView();
    } catch (error: any) {
      console.log('error>>ForgotPasswordFormReset>>:', error);
      const errorMsg =
        error?.response?.data?.error ||
        'Đặt lại mật khẩu thất bại. Mã xác nhận không chính xác hoặc đã hết hạn.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpinCustom spinning={loading}>
      <FormCard>
        {step === 1 ? (
          <>
            <HelloTitle>Forgot</HelloTitle>
            <WelcomeTitle>Password?</WelcomeTitle>

            <Form layout="vertical" onFinish={onRequestReset}>
              <CustomFormItem
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
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
                  placeholder="Enter your email"
                />
              </CustomFormItem>

              <SubmitButton type="submit">Send Reset Code</SubmitButton>

              <FooterText>
                Remember password?{' '}
                <a
                  href="#login"
                  onClick={e => {
                    e.preventDefault();
                    onToggleView();
                  }}
                >
                  <ArrowLeftOutlined /> Back to Sign In
                </a>
              </FooterText>
            </Form>
          </>
        ) : (
          <>
            <HelloTitle>Reset</HelloTitle>
            <WelcomeTitle>Password</WelcomeTitle>

            <Form form={form} layout="vertical" onFinish={onResetPassword}>
              <div
                style={{
                  color: '#64748b',
                  fontSize: '13.5px',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}
              >
                Mã xác nhận đã gửi đến <strong>{email}</strong>. Vui lòng nhập
                mã và điền mật khẩu mới.
              </div>

              {/* Reset Token */}
              <CustomFormItem
                name="token"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã xác nhận!' },
                  { min: 4, message: 'Mã xác nhận tối thiểu 4 ký tự!' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<KeyOutlined />}
                  placeholder="Verification Token"
                />
              </CustomFormItem>

              {/* Password */}
              <CustomFormItem
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' },
                  { max: 50, message: 'Mật khẩu tối đa 50 ký tự!' },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="New Password"
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
                        new Error('Mật khẩu xác nhận không khớp!')
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Confirm New Password"
                />
              </CustomFormItem>

              <SubmitButton type="submit">Reset Password</SubmitButton>

              <FooterText>
                <a
                  href="#back"
                  onClick={e => {
                    e.preventDefault();
                    setStep(1);
                  }}
                >
                  <ArrowLeftOutlined /> Back
                </a>
              </FooterText>
            </Form>
          </>
        )}
      </FormCard>
    </SpinCustom>
  );
};

export default ForgotPasswordForm;
