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

interface RegisterFormProps {
  onToggleView: (registeredIdentifier?: string) => void;
  onNeedsVerification: (email: string) => void;
  onNeedsProfileCompletion?: (profile: {
    googleAccessToken: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleView }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm();

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
        </Form>
      </FormContainer>
    </SpinCustom>
  );
};

export default RegisterForm;
