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
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import UserService from '@/services/UserService';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { toast } from 'sonner';
import { STORAGE, storage } from '@/lib/storage';

const { Title, Text } = Typography;

const ProfileWrapper = styled.div`
  padding: 32px 24px;
  max-width: 960px;
  margin: 0 auto;
`;

const ProfileCard = styled(Card)`
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 25, 92, 0.04);
  overflow: hidden;

  .ant-card-body {
    padding: 36px;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;

  .user-info {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .meta {
    h3 {
      margin: 0 0 6px 0;
      color: #0f172a;
      font-size: 24px;
      font-weight: 700;
    }
    p {
      margin: 0 0 8px 0;
      color: #64748b;
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const EditProfileBtn = styled(Button)`
  border-radius: 10px;
  font-weight: 600;
  background-color: #00695c !important;
  border-color: #00695c !important;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 105, 92, 0.2);

  &:hover {
    background-color: #004d40 !important;
    border-color: #004d40 !important;
    transform: translateY(-1px);
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 20px;
    padding: 28px;
  }
  .ant-modal-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
  }
`;

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

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
        toast.success('Cập nhật thông tin cá nhân thành công!');
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

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Chưa xác định';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <ProfileWrapper>
      <Title
        level={3}
        style={{ marginBottom: 24, color: '#0f172a', fontWeight: 800 }}
      >
        Hồ Sơ Cá Nhân
      </Title>

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
                  size={84}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#00695c',
                    boxShadow: '0 4px 12px rgba(0, 105, 92, 0.2)',
                  }}
                />
                <div className="meta">
                  <h3>{profile?.fullName || 'Người dùng VCMOS'}</h3>
                  <p>
                    {profile?.email ||
                      profile?.phone ||
                      'Chưa cập nhật liên hệ'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tag
                      color="cyan"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      {profile?.role || 'PetOwner'}
                    </Tag>
                    <Tag
                      color="green"
                      icon={<CheckCircleOutlined />}
                      style={{ borderRadius: 6 }}
                    >
                      {profile?.status || 'Active'}
                    </Tag>
                  </div>
                </div>
              </div>

              <EditProfileBtn
                type="primary"
                icon={<EditOutlined />}
                size="large"
                onClick={openEditModal}
              >
                Chỉnh sửa thông tin
              </EditProfileBtn>
            </ProfileHeader>

            <Descriptions
              title={
                <span
                  style={{ fontSize: 17, fontWeight: 700, color: '#1e293b' }}
                >
                  Thông Tin Chi Tiết
                </span>
              }
              bordered
              column={{ xs: 1, sm: 2 }}
              labelStyle={{ fontWeight: 600, color: '#475569', width: '25%' }}
              contentStyle={{ color: '#0f172a' }}
            >
              <Descriptions.Item label="Mã thành viên">
                <Tag
                  color="blue"
                  style={{ fontWeight: 700, fontSize: 13, borderRadius: 6 }}
                >
                  <IdcardOutlined style={{ marginRight: 6 }} />
                  {profile?.code || 'Chưa có mã'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Họ và tên">
                <strong>{profile?.fullName || '-'}</strong>
              </Descriptions.Item>

              <Descriptions.Item label="Số điện thoại">
                <PhoneOutlined style={{ marginRight: 6, color: '#00796b' }} />
                {profile?.phone || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Địa chỉ Email">
                <MailOutlined style={{ marginRight: 6, color: '#00796b' }} />
                {profile?.email || <Text type="secondary">Chưa thiết lập</Text>}
              </Descriptions.Item>

              <Descriptions.Item label="Vai trò hệ thống">
                <Tag color="purple">{profile?.role || 'Khách hàng'}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái tài khoản">
                <Tag color="success">Đang hoạt động</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Ngày gia nhập" span={2}>
                <CalendarOutlined
                  style={{ marginRight: 6, color: '#64748b' }}
                />
                {formatDate(profile?.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </ProfileCard>

      {/* MODAL EDIT PROFILE */}
      <StyledModal
        title="Cập Nhật Thông Tin Cá Nhân"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProfile}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="fullName"
            label={<span style={{ fontWeight: 600 }}>Họ và tên *</span>}
            rules={[
              { required: true, message: 'Họ tên là bắt buộc!' },
              { max: 100, message: 'Tối đa 100 ký tự!' },
            ]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Nguyễn Văn A"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontWeight: 600 }}>Số điện thoại *</span>}
            rules={[
              { required: true, message: 'Số điện thoại là bắt buộc!' },
              {
                pattern: /^0\d{9}$/,
                message: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0!',
              },
            ]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              placeholder="0901234567"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={
              <span style={{ fontWeight: 600 }}>Địa chỉ Email (tùy chọn)</span>
            }
            rules={[
              { type: 'email', message: 'Định dạng email không hợp lệ!' },
            ]}
            extra="Để trống hoặc xoá nội dung nếu bạn không muốn liên kết email."
          >
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="example@mail.com"
            />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
            }}
          >
            <Button size="large" onClick={() => setIsEditModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: '#00695c', borderColor: '#00695c' }}
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </StyledModal>
    </ProfileWrapper>
  );
};

export default ProfilePage;
