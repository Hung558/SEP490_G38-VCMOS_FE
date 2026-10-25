import React from 'react';
import styled from 'styled-components';
import { Card, Row, Col, Typography, Table, Tag, Space, Button } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/routerProvider/authContext';

const { Title, Text } = Typography;

const DashboardWrapper = styled.div`
  padding: 24px;
`;

const StatCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .ant-card-body {
    padding: 20px 24px;
  }
`;

const StatNumber = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 8px;
`;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Tên Mục',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Hoạt động' ? 'green' : 'blue'}>{status}</Tag>
      ),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
  ];

  const dataSource = [
    {
      key: '1',
      id: 'REC-001',
      name: 'Mục mẫu dữ liệu 1',
      status: 'Hoạt động',
      createdAt: '2026-10-23',
    },
    {
      key: '2',
      id: 'REC-002',
      name: 'Mục mẫu dữ liệu 2',
      status: 'Đang xử lý',
      createdAt: '2026-10-23',
    },
  ];

  return (
    <DashboardWrapper>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Bảng Điều Khiển
          </Title>
          <Text type="secondary">
            Chào mừng trở lại{user?.fullName ? `, ${user.fullName}` : ''}! Đây
            là template giao diện mẫu.
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#00195c' }}
          >
            Tạo Mới
          </Button>
        </Space>
      </div>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard>
            <Space direction="vertical" size={2}>
              <Space>
                <UserOutlined style={{ color: '#3b82f6' }} />
                <Text type="secondary">Tổng số người dùng</Text>
              </Space>
              <StatNumber>1,280</StatNumber>
            </Space>
          </StatCard>
        </Col>

        <Col xs={24} sm={8}>
          <StatCard>
            <Space direction="vertical" size={2}>
              <Space>
                <CheckCircleOutlined style={{ color: '#10b981' }} />
                <Text type="secondary">Nhiệm vụ hoàn thành</Text>
              </Space>
              <StatNumber>95.4%</StatNumber>
            </Space>
          </StatCard>
        </Col>

        <Col xs={24} sm={8}>
          <StatCard>
            <Space direction="vertical" size={2}>
              <Space>
                <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                <Text type="secondary">Tiến độ hiện tại</Text>
              </Space>
              <StatNumber>Hoạt động</StatNumber>
            </Space>
          </StatCard>
        </Col>
      </Row>

      <Card
        title="Danh Sách Dữ Liệu Mẫu"
        style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
      >
        <Table columns={columns} dataSource={dataSource} pagination={false} />
      </Card>
    </DashboardWrapper>
  );
};

export default DashboardPage;
