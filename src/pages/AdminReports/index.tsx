import { Space, Typography } from 'antd';
import { PageWrapper } from './components/styles';
import AdminReportsDashboard from './components/AdminReportsDashboard';

const { Title, Text } = Typography;
const AdminReportsPage = () => (
  <PageWrapper>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Tổng quan quản trị
        </Title>
        <Text type="secondary">
          Doanh thu, hoạt động vận hành và quầy lễ tân.
        </Text>
      </div>
      <AdminReportsDashboard />
    </Space>
  </PageWrapper>
);
export default AdminReportsPage;
