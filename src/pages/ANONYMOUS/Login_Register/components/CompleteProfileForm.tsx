import React, { useState } from 'react';
import SpinCustom from '@/components/common/Spin';
import { PhoneOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Avatar, Form, Input } from 'antd';
import UserService from '@/services/UserService';
import styled from 'styled-components';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { STORAGE, storage } from '@/lib/storage';
import type { Login } from '@/types';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';

const FormCard = styled.div`
  background: transparent;
  border-radius: 0;
  padding: 0;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  box-shadow: none;
  border: none;
  animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

const ProfilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;

  .name {
    font-weight: 700;
    color: #0f172a;
    font-size: 15px;
  }

  .email {
    color: #64748b;
    font-size: 13px;
  }
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

export interface PendingGoogleProfile {
  googleAccessToken: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface CompleteProfileFormProps {
  profile: PendingGoogleProfile;
  onToggleView: () => void;
}

const PHONE_PATTERN = /^0\d{9}$/;

const CompleteProfileForm: React.FC<CompleteProfileFormProps> = ({
  profile,
  onToggleView,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const { setIsLogin } = useIsLogin();
  const { setUser } = useAuth();
  const navigate = useNavigate();

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

  const onSubmit = async (values: { phone: string }) => {
    try {
      setLoading(true);
      const res: any = await UserService.completeGoogleProfile({
        googleAccessToken: profile.googleAccessToken,
        phone: values.phone.trim(),
      });

      if (res && res.data) {
        toast.success(res.message || 'Hoàn tất hồ sơ thành công!');
        handleLoginSuccess(res.data);
      }
    } catch (error: any) {
      console.error('Complete profile error:', error);
      const errorMsg =
        error?.response?.data?.error ||
        'Hoàn tất hồ sơ thất bại. Vui lòng thử lại!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpinCustom spinning={loading}>
      <FormCard>
        <HelloTitle>Hoàn tất</HelloTitle>
        <WelcomeTitle>Hồ sơ của bạn.</WelcomeTitle>

        <ProfilePreview>
          <Avatar src={profile.avatarUrl} size={40}>
            {profile.fullName?.charAt(0)}
          </Avatar>
          <div>
            <div className="name">{profile.fullName}</div>
            <div className="email">{profile.email}</div>
          </div>
        </ProfilePreview>

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <CustomFormItem
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              {
                pattern: PHONE_PATTERN,
                message: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0!',
              },
            ]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              placeholder="Số điện thoại (VD: 0901234567)"
            />
          </CustomFormItem>

          <SubmitButton type="submit">Hoàn tất & Đăng nhập</SubmitButton>

          <FooterText>
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

export default CompleteProfileForm;
