import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  Typography,
  Descriptions,
  Spin,
  Avatar,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Alert,
  Grid,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  LockOutlined,
  WarningOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import UserService from '@/services/UserService';
import {
  MSG_PASSWORD_TOO_LONG,
  PASSWORD_MAX_LENGTH,
  checkPasswordRules,
  passwordPolicyValidator,
} from '@/constants/password';
import { getRoleGroup, getRoleLabel } from '@/constants/roles';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { STORAGE, storage } from '@/lib/storage';
import {
  getAccountStatus,
  getProfileSubtitle,
} from './components/profileContent';
import OwnerPetsSection from './components/OwnerPetsSection';
import AdminOverviewSection from './components/AdminOverviewSection';
import StaffWorkSection from './components/StaffWorkSection';

const { Title, Text } = Typography;

const ProfileWrapper = styled.div`
  padding: 32px 24px;
  max-width: 1080px;
  margin: 0 auto;

  @media (max-width: 600px) {
    padding: 20px 12px;
  }
`;

const ProfileCard = styled(Card)`
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  margin-bottom: 32px;

  .ant-card-body {
    padding: 32px;

    @media (max-width: 600px) {
      padding: 20px 16px;
    }
  }

  .ant-descriptions-view {
    border-radius: 10px;
    overflow: hidden;
    border-color: #e2e8f0 !important;
  }

  .ant-descriptions-row {
    border-bottom-color: #e2e8f0 !important;
  }

  .ant-descriptions-item-label {
    background-color: #f8fafc !important;
    border-right-color: #e2e8f0 !important;
    font-size: 13.5px;
    padding: 14px 18px !important;
  }

  .ant-descriptions-item-content {
    background-color: #ffffff !important;
    border-right-color: #e2e8f0 !important;
    font-size: 14px;
    padding: 14px 18px !important;
    word-break: normal !important;
    white-space: normal;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;

  .user-info {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .meta {
    h3 {
      margin: 0 0 4px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
    }
    p {
      margin: 0 0 6px 0;
      color: #64748b;
      font-size: 13.5px;
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const EditProfileBtn = styled(Button)`
  border-radius: 8px;
  font-weight: 600;
  background-color: #0d9488 !important;
  border-color: #0d9488 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: #0f766e !important;
    border-color: #0f766e !important;
    transform: translateY(-1px);
  }
`;

const SecondaryActionBtn = styled(Button)`
  border-radius: 8px;
  font-weight: 600;
  border-color: #0d9488 !important;
  color: #0d9488 !important;
  background-color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: #f0fdfa !important;
    border-color: #0f766e !important;
    color: #0f766e !important;
    transform: translateY(-1px);
  }
`;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const screens = Grid.useBreakpoint();
  const [profile, setProfile] = useState<any>(user);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  // Email verification state
  const [isVerifyEmailModalOpen, setIsVerifyEmailModalOpen] =
    useState<boolean>(false);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [verifyCountdown, setVerifyCountdown] = useState<number>(0);
  const [verifyDevToken, setVerifyDevToken] = useState<string | null>(null);
  const [verifyForm] = Form.useForm();

  // Change password state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState<boolean>(false);
  const [changePasswordLoading, setChangePasswordLoading] =
    useState<boolean>(false);
  const [changePasswordCountdown, setChangePasswordCountdown] =
    useState<number>(0);
  const [changePasswordDevToken, setChangePasswordDevToken] = useState<
    string | null
  >(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>('');
  const [changePasswordForm] = Form.useForm();

  // Timers
  useEffect(() => {
    let timer: any;
    if (verifyCountdown > 0) {
      timer = setInterval(() => setVerifyCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [verifyCountdown]);

  useEffect(() => {
    let timer: any;
    if (changePasswordCountdown > 0) {
      timer = setInterval(
        () => setChangePasswordCountdown(prev => prev - 1),
        1000
      );
    }
    return () => clearInterval(timer);
  }, [changePasswordCountdown]);

  // These two modals unmount their forms while hidden (destroyOnHidden), so the
  // forms are reset once the modal is open, never before
  useEffect(() => {
    if (isVerifyEmailModalOpen) verifyForm.resetFields();
  }, [isVerifyEmailModalOpen, verifyForm]);

  useEffect(() => {
    if (isChangePasswordModalOpen) changePasswordForm.resetFields();
  }, [isChangePasswordModalOpen, changePasswordForm]);

  const fetchProfile = () => {
    setLoading(true);
    UserService.getMyProfile()
      .then((res: any) => {
        if (res && res.user) {
          setProfile(res.user);
          setProfileLoaded(true);
          const currentInfo = storage.getLocalStorage<any>(STORAGE.USER_INFO);
          if (currentInfo) {
            const updated = { ...currentInfo, ...res.user };
            storage.setLocalStorage(STORAGE.USER_INFO, updated);
            setUser(updated);
          }
        }
      })
      .catch((err: any) => {
        console.error('Fetch profile error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditModal = () => {
    form.setFieldsValue({
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email ? values.email.trim() : '',
      };

      const res: any = await UserService.updateMyProfile(payload);
      if (res && res.user) {
        setProfile(res.user);
        toast.success('Cập nhật thông tin cá nhân thành công (MSG17)!');
        setIsEditModalOpen(false);

        const currentInfo = storage.getLocalStorage<any>(STORAGE.USER_INFO);
        if (currentInfo) {
          const updated = { ...currentInfo, ...res.user };
          storage.setLocalStorage(STORAGE.USER_INFO, updated);
          setUser(updated);
        }
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Cập nhật thất bại. Vui lòng kiểm tra lại thông tin!';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyEmailModal = async () => {
    if (!profile?.email) {
      toast.error('Vui lòng cập nhật email trước khi xác thực!');
      openEditModal();
      return;
    }
    setVerifyDevToken(null);
    setIsVerifyEmailModalOpen(true);
    await handleSendEmailOtp();
  };

  // Opened from the "verify your email" notice: start the flow once the
  // fresh profile is loaded (add an email first if the account has none)
  const wantsVerifyEmail = Boolean(
    (location.state as { openVerifyEmail?: boolean } | null)?.openVerifyEmail
  );
  useEffect(() => {
    if (!wantsVerifyEmail || !profileLoaded) return;
    navigate(location.pathname, { replace: true, state: null });
    if (profile?.isEmailVerified) return;
    if (profile?.email) {
      openVerifyEmailModal();
    } else {
      openEditModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsVerifyEmail, profileLoaded]);

  const handleSendEmailOtp = async () => {
    try {
      setVerifyLoading(true);
      const res: any = await UserService.sendMyEmailOtp();
      if (res?.devToken) {
        setVerifyDevToken(res.devToken);
        toast.success(`Mã OTP test: ${res.devToken}`);
      } else {
        toast.success('Mã xác thực OTP đã được gửi tới email của bạn!');
      }
      setVerifyCountdown(60);
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Không thể gửi mã xác thực. Vui lòng thử lại!';
      toast.error(errorMsg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleConfirmVerifyEmail = async (values: { otp: string }) => {
    try {
      setVerifyLoading(true);
      const res: any = await UserService.verifyMyEmail({
        otp: values.otp.trim(),
      });
      toast.success('Xác thực địa chỉ email thành công!');
      setIsVerifyEmailModalOpen(false);

      if (res?.user) {
        setProfile(res.user);
        const currentInfo = storage.getLocalStorage<any>(STORAGE.USER_INFO);
        if (currentInfo) {
          const updated = {
            ...currentInfo,
            ...res.user,
            isEmailVerified: true,
          };
          storage.setLocalStorage(STORAGE.USER_INFO, updated);
          setUser(updated);
        }
      } else {
        setProfile((prev: any) => ({ ...prev, isEmailVerified: true }));
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Mã xác thực không hợp lệ hoặc đã hết hạn!';
      toast.error(errorMsg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const openChangePasswordModal = () => {
    setNewPasswordVal('');
    setChangePasswordDevToken(null);
    setIsChangePasswordModalOpen(true);
  };

  const handleSendChangePasswordOtp = async () => {
    if (changePasswordCountdown > 0) return;
    try {
      setChangePasswordLoading(true);
      const res: any = await UserService.sendChangePasswordOtp();
      if (res?.devToken) {
        setChangePasswordDevToken(res.devToken);
        toast.success(`Mã OTP đổi mật khẩu test: ${res.devToken}`);
      } else {
        toast.success('Mã OTP đổi mật khẩu đã được gửi về email của bạn!');
      }
      setChangePasswordCountdown(60);
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Không thể gửi mã OTP. Vui lòng thử lại sau!';
      toast.error(errorMsg);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleSubmitChangePassword = async (values: any) => {
    try {
      setChangePasswordLoading(true);
      await UserService.changeMyPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        otp: values.otp.trim(),
      });

      toast.success('Đổi mật khẩu tài khoản thành công!');
      setIsChangePasswordModalOpen(false);
      changePasswordForm.resetFields();
      setNewPasswordVal('');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại thông tin!';
      toast.error(errorMsg);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Password strength calculation (MSG06 rules + an optional special character)
  const {
    minLength: hasMinLen,
    digit: hasNum,
    uppercase: hasUpper,
  } = checkPasswordRules(newPasswordVal);
  const hasSpecial = /[@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPasswordVal);

  const getStrengthScore = () => {
    let score = 0;
    if (hasMinLen) score++;
    if (hasNum) score++;
    if (hasUpper) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strengthScore = getStrengthScore();
  const getStrengthLabel = () => {
    if (!newPasswordVal) return 'Chưa nhập';
    if (strengthScore <= 1) return 'Yếu';
    if (strengthScore <= 3) return 'Trung bình';
    return 'Mạnh';
  };

  const role = profile?.role || user?.role || user?.systemRole;
  const roleGroup = getRoleGroup(role);
  const accountStatus = getAccountStatus(profile?.status);
  const isPhone = !screens.sm;

  return (
    <ProfileWrapper>
      <Title
        level={3}
        style={{ marginBottom: 4, color: '#0f172a', fontWeight: 800 }}
      >
        Thông tin tài khoản
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {getProfileSubtitle(role)}
      </Text>

      {/* User Information Card */}
      <ProfileCard>
        {loading && !profile ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <ProfileHeader>
              <div className="user-info">
                <Avatar
                  size={76}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#0d9488',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
                  }}
                />
                <div className="meta">
                  <h3>{profile?.fullName || 'Chưa cập nhật'}</h3>
                  <p>
                    {[profile?.email, profile?.phone]
                      .filter(Boolean)
                      .join(' · ') || 'Chưa cập nhật'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {profile?.code && (
                      <Tag
                        color="cyan"
                        style={{ borderRadius: 6, fontWeight: 600 }}
                      >
                        Mã: {profile.code}
                      </Tag>
                    )}
                    <Tag
                      color="teal"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      {getRoleLabel(role)}
                    </Tag>
                    <Tag
                      color={accountStatus.color}
                      icon={
                        profile?.status === 'Locked' ? (
                          <LockOutlined />
                        ) : profile?.status === 'Active' ? (
                          <CheckCircleOutlined />
                        ) : undefined
                      }
                      style={{ borderRadius: 6 }}
                    >
                      {accountStatus.label}
                    </Tag>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <SecondaryActionBtn
                  icon={<KeyOutlined />}
                  size="large"
                  onClick={openChangePasswordModal}
                >
                  Đổi mật khẩu
                </SecondaryActionBtn>
                <EditProfileBtn
                  type="primary"
                  icon={<EditOutlined />}
                  size="large"
                  onClick={openEditModal}
                >
                  Chỉnh sửa thông tin
                </EditProfileBtn>
              </div>
            </ProfileHeader>

            {/* On phones the label goes above the value: side by side, the
                140px label column left the values cut off */}
            <Descriptions
              bordered
              size="middle"
              layout={isPhone ? 'vertical' : 'horizontal'}
              column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
              styles={
                isPhone
                  ? { label: { fontWeight: 600, color: '#475569' } }
                  : {
                      label: {
                        fontWeight: 600,
                        color: '#475569',
                        width: '18%',
                        minWidth: '140px',
                        whiteSpace: 'nowrap',
                      },
                      content: {
                        color: '#0f172a',
                        width: '32%',
                      },
                    }
              }
            >
              <Descriptions.Item label="Mã thành viên">
                <Tag
                  color="teal"
                  style={{
                    fontWeight: 700,
                    borderRadius: 6,
                    padding: '2px 10px',
                    margin: 0,
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <IdcardOutlined />
                  {profile?.code || 'Chưa cập nhật'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Họ và tên">
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#0f172a',
                  }}
                >
                  {profile?.fullName || 'Chưa cập nhật'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Số điện thoại">
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                  }}
                >
                  <PhoneOutlined
                    style={{ color: '#0d9488', fontSize: '15px' }}
                  />
                  <span>{profile?.phone || 'Chưa cập nhật'}</span>
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Email xác thực">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <MailOutlined
                    style={{ color: '#0d9488', fontSize: '15px' }}
                  />
                  <span style={{ color: '#334155', fontWeight: 500 }}>
                    {profile?.email || 'Chưa cập nhật'}
                  </span>
                  {profile?.email ? (
                    profile?.isEmailVerified ? (
                      <Tag
                        color="success"
                        icon={<CheckCircleOutlined />}
                        style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}
                      >
                        Đã xác thực
                      </Tag>
                    ) : (
                      <>
                        <Tag
                          color="warning"
                          icon={<WarningOutlined />}
                          style={{
                            borderRadius: 6,
                            fontWeight: 600,
                            margin: 0,
                          }}
                        >
                          Chưa xác thực
                        </Tag>
                        <Button
                          type="link"
                          size="small"
                          onClick={openVerifyEmailModal}
                          style={{
                            color: '#0d9488',
                            fontWeight: 700,
                            padding: 0,
                            height: 'auto',
                            fontSize: '13px',
                          }}
                        >
                          Xác thực ngay &rarr;
                        </Button>
                      </>
                    )
                  ) : (
                    <Button
                      type="link"
                      size="small"
                      onClick={openEditModal}
                      style={{
                        color: '#0d9488',
                        fontWeight: 700,
                        padding: 0,
                        height: 'auto',
                        fontSize: '13px',
                      }}
                    >
                      Thêm email &rarr;
                    </Button>
                  )}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Vai trò">
                {getRoleLabel(role)}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày tham gia">
                {profile?.createdAt
                  ? dayjs(profile.createdAt).format('DD/MM/YYYY')
                  : 'Chưa cập nhật'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </ProfileCard>

      {/* Role-specific part: the owner's pets, the admin overview or the staff work */}
      {roleGroup === 'owner' && <OwnerPetsSection />}
      {roleGroup === 'admin' && <AdminOverviewSection />}
      {roleGroup === 'staff' && <StaffWorkSection role={role} />}

      {/* Edit Profile Modal */}
      <Modal
        title="Chỉnh Sửa Thông Tin Cá Nhân"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        // Mounted up front so openEditModal can fill the form before it opens
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Địa chỉ Email"
            extra="Lưu ý: Nếu thay đổi địa chỉ email, hệ thống sẽ yêu cầu xác thực lại email mới để bảo vệ tài khoản."
          >
            <Input size="large" placeholder="tenban@gmail.com" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
            size="large"
            style={{ background: '#0d9488', marginTop: 12 }}
          >
            Lưu thay đổi
          </Button>
        </Form>
      </Modal>

      {/* Verify Email Modal */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#0f172a',
            }}
          >
            <SafetyCertificateOutlined
              style={{ color: '#0d9488', fontSize: 20 }}
            />
            <span>Xác Thực Địa Chỉ Email Tài Khoản</span>
          </div>
        }
        open={isVerifyEmailModalOpen}
        onCancel={() => setIsVerifyEmailModalOpen(false)}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#64748b', fontSize: 13.5, marginBottom: 16 }}>
            Mã xác thực gồm 6 chữ số đã được gửi tới email:{' '}
            <strong style={{ color: '#0f172a' }}>{profile?.email}</strong>. Vui
            lòng nhập mã để hoàn tất xác thực tài khoản.
          </p>

          {verifyDevToken && (
            <div
              style={{
                background: '#f0fdfa',
                border: '1px solid #ccfbf1',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#0f766e',
              }}
            >
              💡 <strong>Môi trường phát triển:</strong> Mã OTP test:{' '}
              <strong style={{ fontSize: 15, letterSpacing: '2px' }}>
                {verifyDevToken}
              </strong>
            </div>
          )}

          <Form
            form={verifyForm}
            layout="vertical"
            onFinish={handleConfirmVerifyEmail}
          >
            <Form.Item
              name="otp"
              label={
                <span style={{ fontWeight: 600 }}>Mã xác thực OTP (6 số)</span>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mã xác thực OTP!' },
                { len: 6, message: 'Mã OTP phải gồm 6 chữ số!' },
              ]}
            >
              <Input
                size="large"
                maxLength={6}
                placeholder="------"
                style={{
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  height: 48,
                }}
              />
            </Form.Item>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
                fontSize: 13,
                color: '#64748b',
              }}
            >
              <span>Hiệu lực trong vòng 5 phút</span>
              {verifyCountdown > 0 ? (
                <span style={{ color: '#0d9488', fontWeight: 600 }}>
                  Gửi lại sau {verifyCountdown}s
                </span>
              ) : (
                <Button
                  type="link"
                  onClick={handleSendEmailOtp}
                  loading={verifyLoading}
                  style={{
                    color: '#0d9488',
                    padding: 0,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <ReloadOutlined /> Gửi lại mã OTP
                </Button>
              )}
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={verifyLoading}
              block
              size="large"
              style={{
                backgroundColor: '#0d9488',
                borderColor: '#0d9488',
                fontWeight: 700,
                height: 46,
                borderRadius: 10,
              }}
            >
              Xác nhận kích hoạt Email
            </Button>
          </Form>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#0f172a',
            }}
          >
            <LockOutlined style={{ color: '#0d9488', fontSize: 20 }} />
            <span>Đổi Mật Khẩu Tài Khoản</span>
          </div>
        }
        open={isChangePasswordModalOpen}
        onCancel={() => setIsChangePasswordModalOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <div style={{ padding: '8px 0' }}>
          {!profile?.email ? (
            <Alert
              type="warning"
              showIcon
              message="Chưa có email liên kết"
              description={
                <div>
                  Để đổi mật khẩu, bạn cần cập nhật địa chỉ email để nhận mã OTP
                  xác thực bảo mật.
                  <div style={{ marginTop: 10 }}>
                    <Button
                      type="primary"
                      size="small"
                      style={{ background: '#0d9488' }}
                      onClick={() => {
                        setIsChangePasswordModalOpen(false);
                        openEditModal();
                      }}
                    >
                      Cập nhật email ngay
                    </Button>
                  </div>
                </div>
              }
            />
          ) : !profile?.isEmailVerified ? (
            <Alert
              type="warning"
              showIcon
              message="Yêu cầu xác thực Email trước khi đổi mật khẩu"
              description={
                <div>
                  Địa chỉ email <strong>{profile?.email}</strong> chưa được xác
                  thực. Hệ thống yêu cầu xác thực email để gửi mã OTP bảo vệ tài
                  khoản.
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      style={{ background: '#0d9488' }}
                      onClick={() => {
                        setIsChangePasswordModalOpen(false);
                        openVerifyEmailModal();
                      }}
                    >
                      Xác thực email ngay &rarr;
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <Form
              form={changePasswordForm}
              layout="vertical"
              onFinish={handleSubmitChangePassword}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                Mã OTP xác thực sẽ được gửi tới email đã xác minh:{' '}
                <strong style={{ color: '#0f172a' }}>{profile?.email}</strong>
              </div>

              <Form.Item
                name="currentPassword"
                label={
                  <span style={{ fontWeight: 600 }}>Mật khẩu hiện tại *</span>
                }
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập mật khẩu hiện tại',
                  },
                ]}
              >
                <Input.Password
                  size="large"
                  placeholder="Nhập mật khẩu hiện tại"
                  prefix={<LockOutlined style={{ color: '#64748b' }} />}
                  iconRender={visible =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={<span style={{ fontWeight: 600 }}>Mật khẩu mới *</span>}
                dependencies={['currentPassword']}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { validator: passwordPolicyValidator },
                  { max: PASSWORD_MAX_LENGTH, message: MSG_PASSWORD_TOO_LONG },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (
                        !value ||
                        getFieldValue('currentPassword') !== value
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('Mật khẩu mới phải khác mật khẩu hiện tại!')
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  placeholder="Ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số"
                  prefix={<LockOutlined style={{ color: '#64748b' }} />}
                  iconRender={visible =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                  onChange={e => setNewPasswordVal(e.target.value)}
                />
              </Form.Item>

              {/* Password Strength Indicator */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 4,
                  }}
                >
                  <span>Độ mạnh mật khẩu:</span>
                  <strong
                    style={{
                      color:
                        strengthScore >= 3
                          ? '#059669'
                          : strengthScore >= 2
                            ? '#d97706'
                            : '#dc2626',
                    }}
                  >
                    {getStrengthLabel()}
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: 4, height: 4 }}>
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background:
                        strengthScore >= 1
                          ? strengthScore >= 3
                            ? '#10b981'
                            : '#f59e0b'
                          : '#e2e8f0',
                      transition: 'background 0.3s',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background:
                        strengthScore >= 2
                          ? strengthScore >= 3
                            ? '#10b981'
                            : '#f59e0b'
                          : '#e2e8f0',
                      transition: 'background 0.3s',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background: strengthScore >= 3 ? '#10b981' : '#e2e8f0',
                      transition: 'background 0.3s',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background: strengthScore >= 4 ? '#10b981' : '#e2e8f0',
                      transition: 'background 0.3s',
                    }}
                  />
                </div>
              </div>

              <Form.Item
                name="confirmPassword"
                label={
                  <span style={{ fontWeight: 600 }}>
                    Xác nhận mật khẩu mới *
                  </span>
                }
                dependencies={['newPassword']}
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng xác nhận mật khẩu mới',
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
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
                  placeholder="Nhập lại mật khẩu mới"
                  prefix={<LockOutlined style={{ color: '#64748b' }} />}
                  iconRender={visible =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              {/* OTP Section */}
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 14,
                  background: '#f8fafc',
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: '#0f172a',
                    }}
                  >
                    Mã xác thực OTP từ Email
                  </span>
                  {changePasswordCountdown > 0 ? (
                    <span
                      style={{
                        fontSize: 12.5,
                        color: '#0d9488',
                        fontWeight: 600,
                      }}
                    >
                      Gửi lại sau {changePasswordCountdown}s
                    </span>
                  ) : (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleSendChangePasswordOtp}
                      loading={changePasswordLoading}
                      style={{ color: '#0d9488', padding: 0, fontWeight: 700 }}
                    >
                      <SafetyCertificateOutlined /> Lấy mã OTP
                    </Button>
                  )}
                </div>

                {changePasswordDevToken && (
                  <div
                    style={{
                      background: '#f0fdfa',
                      border: '1px solid #ccfbf1',
                      borderRadius: 6,
                      padding: '6px 10px',
                      marginBottom: 10,
                      fontSize: 12,
                      color: '#0f766e',
                    }}
                  >
                    💡 OTP test: <strong>{changePasswordDevToken}</strong>
                  </div>
                )}

                <Form.Item
                  name="otp"
                  rules={[
                    {
                      required: true,
                      message: 'Vui lòng nhập mã OTP đã nhận!',
                    },
                    { len: 6, message: 'Mã OTP phải gồm 6 chữ số!' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    size="large"
                    maxLength={6}
                    placeholder="Nhập 6 số OTP"
                    style={{
                      letterSpacing: '4px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}
                  />
                </Form.Item>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordLoading}
                block
                size="large"
                style={{
                  backgroundColor: '#0d9488',
                  borderColor: '#0d9488',
                  fontWeight: 700,
                  height: 46,
                  borderRadius: 10,
                }}
              >
                Xác nhận đổi mật khẩu
              </Button>
            </Form>
          )}
        </div>
      </Modal>
    </ProfileWrapper>
  );
};

export default ProfilePage;
