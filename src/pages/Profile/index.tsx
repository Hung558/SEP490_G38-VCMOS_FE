import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Card, Typography, Descriptions, Spin, Avatar, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import UserService from '@/services/UserService';
import { useAuth } from '@/contexts/routerProvider/authContext';

const { Title, Text } = Typography;

const ProfileWrapper = styled.div`
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
`;

const ProfileCard = styled(Card)`
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
`;

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    UserService.getMyProfile()
      .then((res: any) => {
        if (res && res.user) {
          setProfile(res.user);
        }
      })
      .catch(() => {
        // Fallback to authContext user if endpoint not ready
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <ProfileWrapper>
      <Title level={3} style={{ marginBottom: 24, color: '#0f172a' }}>
        Thông Tin Cá Nhân
      </Title>

      <ProfileCard>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <ProfileHeader>
              <Avatar
                size={72}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#00195c' }}
              />
              <div>
                <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                  {profile?.fullName || 'Người dùng VCMOS'}
                </Title>
                <Text type="secondary">
                  {profile?.email || profile?.phone || 'Chưa cập nhật'}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue">
                    {profile?.role || profile?.systemRole || 'Thành viên'}
                  </Tag>
                </div>
              </div>
            </ProfileHeader>

            <Descriptions
              title="Chi Tiết Tài Khoản"
              bordered
              column={{ xs: 1, sm: 2 }}
            >
              <Descriptions.Item label="Họ và tên">
                {profile?.fullName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {profile?.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {profile?.email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                {profile?.role || profile?.systemRole || 'User'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã ID">
                {profile?._id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color="green">Đang hoạt động</Tag>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </ProfileCard>
    </ProfileWrapper>
  );
};

export default ProfilePage;
