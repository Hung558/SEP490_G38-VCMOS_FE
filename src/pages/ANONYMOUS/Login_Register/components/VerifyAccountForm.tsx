import React, { useState } from 'react';
import SpinCustom from '@/components/common/Spin';
import {
  KeyOutlined,
  MailOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Form, Input } from 'antd';
import UserService from '@/services/UserService';
import styled from 'styled-components';
import { toast } from 'sonner';

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
  color: #00195c;
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
  }

  .ant-input-affix-wrapper .ant-input {
    background-color: transparent !important;
    border: none !important;
    padding: 0 !important;
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
  margin-top: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);

  &:hover {
    background: #0f766e;
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

interface VerifyAccountFormProps {
  email: string;
  onToggleView: () => void;
}

// Standalone verification screen, reachable both right after registering
// (RegisterForm hands off here) and from a failed "not verified yet" login
// (LoginForm hands off here too) — previously the OTP-entry UI only existed
// inside RegisterForm's own local state, so clicking "resend code" from the
// login screen sent a new email but had nowhere for the user to type it in.
const VerifyAccountForm: React.FC<VerifyAccountFormProps> = ({
  email: initialEmail,
  onToggleView,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(initialEmail);
  const [form] = Form.useForm();

  const onVerify = async (values: { email: string; token: string }) => {
    try {
      setLoading(true);
      const emailVal = values.email.trim();
      setEmail(emailVal);
      await UserService.verifyAccount({
        email: emailVal,
        token: values.token.trim(),
      });
      toast.success('Xác thực tài khoản thành công! Vui lòng đăng nhập.');
      form.resetFields();
      onToggleView();
    } catch (error: any) {
      console.error('Verify account error:', error);
      const errorMsg =
        error?.response?.data?.error ||
        'Xác thực thất bại. Mã không đúng hoặc đã hết hạn.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    const emailVal = (form.getFieldValue('email') || email || '').trim();
    if (!emailVal) {
      toast.error('Vui lòng nhập email trước khi gửi lại mã.');
      return;
    }
    try {
      setLoading(true);
      const res: any = await UserService.resendVerification({
        email: emailVal,
      });
      toast.success(
        res.message || 'Mã xác thực mới đã được gửi. Vui lòng kiểm tra email.'
      );
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast.error(
        error?.response?.data?.error || 'Gửi lại mã thất bại. Vui lòng thử lại!'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpinCustom spinning={loading}>
      <FormCard>
        <HelloTitle>Xác thực</HelloTitle>
        <WelcomeTitle>Email của bạn.</WelcomeTitle>

        <Form
          form={form}
          layout="vertical"
          onFinish={onVerify}
          initialValues={{ email: initialEmail }}
        >
          <div
            style={{
              color: '#64748b',
              fontSize: '13.5px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            Nhập email và mã xác thực đã được gửi để hoàn tất xác minh tài
            khoản.
          </div>

          <CustomFormItem
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Định dạng email không đúng!',
              },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder="Email" />
          </CustomFormItem>

          <CustomFormItem
            name="token"
            rules={[
              { required: true, message: 'Vui lòng nhập mã xác thực!' },
              { min: 4, message: 'Mã xác thực tối thiểu 4 ký tự!' },
            ]}
          >
            <Input
              size="large"
              prefix={<KeyOutlined />}
              placeholder="Mã xác thực OTP"
            />
          </CustomFormItem>

          <SubmitButton type="submit">Xác thực tài khoản</SubmitButton>

          <FooterText>
            Không nhận được mã?{' '}
            <a
              href="#resend"
              onClick={e => {
                e.preventDefault();
                onResendCode();
              }}
            >
              Gửi lại
            </a>
          </FooterText>
          <FooterText style={{ marginTop: '8px' }}>
            <a
              href="#back"
              onClick={e => {
                e.preventDefault();
                onToggleView();
              }}
            >
              <ArrowLeftOutlined /> Quay lại đăng nhập
            </a>
          </FooterText>
        </Form>
      </FormCard>
    </SpinCustom>
  );
};

export default VerifyAccountForm;
