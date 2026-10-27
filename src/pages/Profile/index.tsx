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
  Timeline,
  Table,
  Alert,
  Segmented,
  Empty,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  KeyOutlined,
  LockOutlined,
  WarningOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import UserService from '@/services/UserService';
import PetService from '@/services/PetService';
import type { Pet } from '@/types';
import {
  calculatePetAge,
  getSpeciesEmoji,
} from '../Dashboard/components/PetDetailModal';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { STORAGE, storage } from '@/lib/storage';

const { Title } = Typography;

const ProfileWrapper = styled.div`
  padding: 32px 24px;
  max-width: 1080px;
  margin: 0 auto;
`;

const ProfileCard = styled(Card)`
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  margin-bottom: 32px;

  .ant-card-body {
    padding: 32px;
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

// Pet Profile Card & Timeline
const PetProfileBox = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;

  .pet-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;

    .pet-identity {
      display: flex;
      align-items: center;
      gap: 16px;

      .pet-avatar {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        background: #f0fdfa;
        color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        border: 1.5px solid #ccfbf1;
      }

      .pet-details {
        h4 {
          margin: 0 0 2px 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        span {
          font-size: 13px;
          color: #64748b;
        }
      }
    }

    .badge-wrap {
      display: flex;
      gap: 8px;
    }
  }

  .pet-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 24px;

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .metric {
      .label {
        font-size: 11.5px;
        color: #64748b;
        margin-bottom: 2px;
      }
      .val {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
    }
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 750;
      color: #0f172a;
    }
  }
`;

const MilestoneCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 8px;
  transition: all 0.15s;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .m-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .m-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .m-status {
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: #dcfce7;
      color: #15803d;
    }
  }

  .m-body {
    font-size: 13px;
    color: #475569;
    margin-bottom: 12px;
  }

  .m-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px dashed #f1f5f9;
    font-size: 12.5px;

    .actions {
      display: flex;
      gap: 10px;

      .btn-m-action {
        background: transparent;
        border: 1px solid #cbd5e1;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        color: #334155;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.15s;

        &:hover {
          border-color: #0d9488;
          color: #0d9488;
        }

        &.primary {
          background: #f0fdfa;
          border-color: #ccfbf1;
          color: #0f766e;
        }
      }
    }
  }
`;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSoapModalOpen, setIsSoapModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  // Pets state
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [petsLoading, setPetsLoading] = useState<boolean>(false);

  const fetchPets = () => {
    setPetsLoading(true);
    PetService.listPets({ status: 'Active' })
      .then(res => {
        const items = res.items || [];
        setUserPets(items);
        if (items.length > 0) {
          setSelectedPetId(items[0]._id);
        }
      })
      .catch(err => {
        console.error('Fetch pets error:', err);
      })
      .finally(() => {
        setPetsLoading(false);
      });
  };

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

  const fetchProfile = () => {
    setLoading(true);
    UserService.getMyProfile()
      .then((res: any) => {
        if (res && res.user) {
          setProfile(res.user);
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
    fetchPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPet =
    userPets.find(p => p._id === selectedPetId) || userPets[0] || null;

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
    verifyForm.resetFields();
    setVerifyDevToken(null);
    setIsVerifyEmailModalOpen(true);
    await handleSendEmailOtp();
  };

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
    changePasswordForm.resetFields();
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

  // Password strength calculation
  const hasMinLen = newPasswordVal.length >= 8;
  const hasNum = /\d/.test(newPasswordVal);
  const hasUpper = /[A-Z]/.test(newPasswordVal);
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

  return (
    <ProfileWrapper>
      <Title
        level={3}
        style={{ marginBottom: 24, color: '#0f172a', fontWeight: 800 }}
      >
        Hồ Sơ Chủ Nuôi & Bệnh Án Thú Cưng
      </Title>

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
                  <h3>{profile?.fullName || 'Nguyen Van A'}</h3>
                  <p>
                    {profile?.email || 'owner@vcmos.com'} ·{' '}
                    {profile?.phone || '0901000001'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tag
                      color="cyan"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      Mã: {profile?.code || 'USR-000001'}
                    </Tag>
                    <Tag
                      color="teal"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      {profile?.role || 'PetOwner'}
                    </Tag>
                    <Tag
                      color="green"
                      icon={<CheckCircleOutlined />}
                      style={{ borderRadius: 6 }}
                    >
                      Active
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

            <Descriptions
              bordered
              size="middle"
              column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
              labelStyle={{
                fontWeight: 600,
                color: '#475569',
                width: '18%',
                minWidth: '140px',
                whiteSpace: 'nowrap',
              }}
              contentStyle={{
                color: '#0f172a',
                width: '32%',
              }}
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
                  {profile?.code || 'USR-000001'}
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
                  {profile?.fullName || 'Nguyen Van A'}
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
                  <span>{profile?.phone || '0901000001'}</span>
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
            </Descriptions>
          </>
        )}
      </ProfileCard>

      {/* Pet Profile & Unified Medical Timeline */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title
          level={4}
          style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}
        >
          Hồ Sơ Thú Cưng & Dòng Thời Gian Bệnh Án Điện Tử
        </Title>
        <Button
          type="primary"
          style={{ background: '#0d9488', borderColor: '#0d9488' }}
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTER.DASHBOARD)}
        >
          Quản lý thú cưng tại Dashboard
        </Button>
      </div>

      {userPets.length === 0 ? (
        <Card
          style={{
            borderRadius: 16,
            textAlign: 'center',
            padding: '36px 20px',
            border: '1px solid #e2e8f0',
            marginBottom: 32,
          }}
        >
          <Empty
            description={
              <div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}
                >
                  Bạn chưa có hồ sơ thú cưng nào
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Tạo hồ sơ thú cưng để theo dõi bệnh án điện tử SOAP/EMR và
                  lịch sử tiêm phòng
                </div>
              </div>
            }
          >
            <Button
              type="primary"
              style={{
                background: '#0d9488',
                borderColor: '#0d9488',
                marginTop: 16,
              }}
              icon={<PlusOutlined />}
              onClick={() => navigate(ROUTER.DASHBOARD)}
            >
              + Đăng ký thú cưng tại Dashboard
            </Button>
          </Empty>
        </Card>
      ) : (
        <Spin spinning={petsLoading}>
          <PetProfileBox>
            {userPets.length > 1 && (
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}
                >
                  Chọn thú cưng:
                </span>
                <Segmented
                  value={selectedPetId}
                  onChange={val => setSelectedPetId(val as string)}
                  options={userPets.map(p => ({
                    label: `🐾 ${p.name} (${p.species || 'Thú cưng'})`,
                    value: p._id,
                  }))}
                />
              </div>
            )}

            <div className="pet-top">
              <div className="pet-identity">
                {currentPet?.photoUrl ? (
                  <img
                    src={currentPet.photoUrl}
                    alt={currentPet.name}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      objectFit: 'cover',
                      border: '2px solid #0d9488',
                    }}
                  />
                ) : (
                  <div className="pet-avatar">
                    {getSpeciesEmoji(currentPet?.species)}
                  </div>
                )}
                <div className="pet-details">
                  <h4>
                    Bé {currentPet?.name} · Mã {currentPet?.code}
                  </h4>
                  <span>
                    {currentPet?.species || 'Thú cưng'}
                    {currentPet?.breed ? ` · ${currentPet.breed}` : ''}
                    {currentPet?.dob
                      ? ` · Ngày sinh: ${dayjs(currentPet.dob).format('DD/MM/YYYY')} (${calculatePetAge(currentPet.dob)})`
                      : ''}
                  </span>
                </div>
              </div>
              <div className="badge-wrap">
                {currentPet?.notes && (
                  <Tag color="magenta">⚠️ {currentPet.notes}</Tag>
                )}
                <Tag color="cyan">Đang theo dõi sức khỏe</Tag>
              </div>
            </div>

            <div className="pet-metrics-grid">
              <div className="metric">
                <div className="label">Thể trọng hiện tại</div>
                <div className="val">
                  {currentPet?.weight !== null &&
                  currentPet?.weight !== undefined
                    ? `${currentPet.weight} kg`
                    : 'Chưa cập nhật'}
                </div>
              </div>
              <div className="metric">
                <div className="label">Màu lông</div>
                <div className="val">
                  {currentPet?.coatColor || 'Chưa cập nhật'}
                </div>
              </div>
              <div className="metric">
                <div className="label">Bác sĩ phụ trách</div>
                <div className="val">
                  {(currentPet as any)?.assignedDoctor || 'Chưa phân công'}
                </div>
              </div>
              <div className="metric">
                <div className="label">Lần khám gần nhất</div>
                <div className="val">
                  {(currentPet as any)?.lastVisitDate
                    ? dayjs((currentPet as any).lastVisitDate).format(
                        'DD/MM/YYYY'
                      )
                    : 'Chưa có lượt khám'}
                </div>
              </div>
            </div>

            <div className="timeline-header">
              <h4>Dòng thời gian y khoa hợp nhất (Unified EMR Timeline)</h4>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Hợp nhất Khám - Grooming - Nội trú - Hoá đơn
              </span>
            </div>

            {(currentPet as any)?.medicalRecords &&
            (currentPet as any).medicalRecords.length > 0 ? (
              <Timeline
                items={((currentPet as any).medicalRecords as any[]).map(
                  (rec: any, idx: number) => ({
                    color: rec.color || '#0d9488',
                    children: (
                      <MilestoneCard key={idx}>
                        <div className="m-header">
                          <div className="m-title">{rec.title}</div>
                          <span className="m-status">
                            {rec.status || 'Đã hoàn tất (Done)'}
                          </span>
                        </div>
                        <div className="m-body">
                          Thời gian: <strong>{rec.date}</strong> · Bác sĩ:{' '}
                          <strong>{rec.doctor}</strong>
                          <br />
                          {rec.diagnosis}
                        </div>
                      </MilestoneCard>
                    ),
                  })
                )}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1',
                  margin: '16px 0',
                }}
              >
                <FileTextOutlined
                  style={{ fontSize: 36, color: '#94a3b8', marginBottom: 10 }}
                />
                <div
                  style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}
                >
                  Bé {currentPet?.name} chưa có bệnh án điện tử SOAP hoặc lịch
                  sử khám
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    marginTop: 4,
                    marginBottom: 16,
                    maxWidth: 420,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  Khi bé đến khám, toàn bộ chẩn đoán SOAP, đơn thuốc, lịch tiêm
                  phòng và lịch sử chăm sóc sẽ được lưu trữ tự động tại đây.
                </div>
                <Button
                  type="primary"
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}
                  icon={<CalendarOutlined />}
                  onClick={() => navigate(ROUTER.HOME + '#quick-booking')}
                >
                  + Đặt lịch khám cho bé {currentPet?.name}
                </Button>
              </div>
            )}
          </PetProfileBox>
        </Spin>
      )}

      {/* Edit Profile Modal */}
      <Modal
        title="Chỉnh Sửa Thông Tin Cá Nhân"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
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
        destroyOnClose
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
        destroyOnClose
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
                  { min: 8, message: 'Mật khẩu phải có tối thiểu 8 ký tự' },
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
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
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

      {/* View SOAP Medical Record Modal */}
      <Modal
        title="Bệnh Án Điện Tử SOAP Chuẩn Y Khoa"
        open={isSoapModalOpen}
        onCancel={() => setIsSoapModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsSoapModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => toast.success('Đang tạo tệp PDF bệnh án điện tử...')}
          >
            Xuất file PDF bệnh án
          </Button>,
        ]}
        width={700}
      >
        <div style={{ padding: '8px 0', fontSize: 13.5 }}>
          <div
            style={{
              background: '#f8fafc',
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div>
              Bệnh nhân:{' '}
              <strong>
                Bé {currentPet?.name || 'Thú cưng'} (
                {currentPet?.species || 'Thú cưng'}
                {currentPet?.breed ? ` · ${currentPet.breed}` : ''}
                {currentPet?.weight ? ` · ${currentPet.weight} kg` : ''})
              </strong>{' '}
              · Chủ nuôi:{' '}
              <strong>
                {profile?.fullName || user?.fullName || 'Khách hàng'}
              </strong>
            </div>
            <div>
              Bác sĩ khám: <strong>BS. Trần Thị B</strong> · Ngày khám:{' '}
              <strong>25/10/2026</strong>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              S - SUBJECTIVE (Triệu chứng cơ năng theo lời chủ báo):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Chủ báo bé bỏ ăn 2 ngày nay, nôn nhẹ dịch bọt trắng buổi sáng, uể
              oải, ít vận động so với ngày thường.
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              O - OBJECTIVE (Dấu hiệu thực thể qua thăm khám lâm sàng):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Nhiệt độ 39.5°C, niêm mạc nhạt nhẹ, nhịp thở 28 lần/phút, bụng mềm
              không chướng căng. Xét nghiệm máu: Bạch cầu tăng nhẹ.
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              A - ASSESSMENT (Chẩn đoán xác định):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Viêm dạ dày ruột cấp tính (Acute Gastroenteritis).
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              P - PLAN (Phác đồ điều trị & Đơn thuốc kê toa):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Nhập viện theo dõi Chuồng C-01, truyền dịch cân bằng điện giải,
              dùng kháng sinh Amoxicillin 250mg trong 5 ngày.
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Đơn thuốc chỉ định:
            </div>
            <Table
              size="small"
              pagination={false}
              columns={[
                { title: 'Thuốc / Sản phẩm', dataIndex: 'name', key: 'name' },
                { title: 'Liều lượng', dataIndex: 'dose', key: 'dose' },
                { title: 'Tần suất', dataIndex: 'freq', key: 'freq' },
                { title: 'Số lượng', dataIndex: 'qty', key: 'qty' },
              ]}
              dataSource={[
                {
                  key: '1',
                  name: 'Amoxicillin 250mg',
                  dose: '1 viên',
                  freq: '2 lần/ngày (sau ăn)',
                  qty: '10 viên',
                },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        title="Hoá Đơn Dịch Vụ Khám & Điều Trị"
        open={isInvoiceModalOpen}
        onCancel={() => setIsInvoiceModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsInvoiceModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="download"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => toast.success('Đã tải hóa đơn điện tử (PDF)')}
          >
            Tải hoá đơn PDF
          </Button>,
        ]}
        width={650}
      >
        <div style={{ padding: '8px 0', fontSize: 13.5 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div>
              Mã hoá đơn: <strong>#INV-20261025-01</strong>
              <br />
              Thú cưng: <strong>Bé {currentPet?.name || 'Thú cưng'}</strong> (
              {currentPet?.code || 'Chưa cấp mã'})
            </div>
            <div style={{ textAlign: 'right' }}>
              Ngày xuất: <strong>25/10/2026</strong>
              <br />
              Trạng thái: <Tag color="green">Đã thanh toán (Paid)</Tag>
            </div>
          </div>

          <Table
            size="small"
            pagination={false}
            columns={[
              { title: 'Khoản mục', dataIndex: 'item', key: 'item' },
              { title: 'Đơn giá', dataIndex: 'price', key: 'price' },
              { title: 'SL', dataIndex: 'qty', key: 'qty' },
              { title: 'Thành tiền', dataIndex: 'total', key: 'total' },
            ]}
            dataSource={[
              {
                key: '1',
                item: 'Khám lâm sàng tổng quát',
                price: '150.000đ',
                qty: 1,
                total: '150.000đ',
              },
              {
                key: '2',
                item: 'Thuốc Amoxicillin 250mg (vỉ)',
                price: '5.000đ',
                qty: 10,
                total: '50.000đ',
              },
            ]}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 18,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            <span>Phương thức: Tiền mặt (Cash) / VNPay QR</span>
            <span style={{ color: '#0d9488' }}>Tổng cộng: 200.000đ</span>
          </div>
        </div>
      </Modal>
    </ProfileWrapper>
  );
};

export default ProfilePage;
