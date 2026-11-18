import { Space, Typography } from 'antd';
import BestSellingCard from './components/BestSellingCard';
import { PageWrapper } from './components/styles';

const { Title, Text } = Typography;

/**
 * SCR-28 Thống kê của Admin (nghiệp vụ 7.3). BE mới có báo cáo sản phẩm bán
 * chạy; doanh thu, lượt khám và đơn theo trạng thái chưa có API nên chưa có ở đây.
 */
const AdminReportsPage = () => (
  <PageWrapper>
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Thống kê
        </Title>
        <Text type="secondary">
          Số liệu bán hàng của phòng khám, tính từ các hóa đơn đã thanh toán.
        </Text>
      </div>
      <BestSellingCard />
    </Space>
  </PageWrapper>
);

export default AdminReportsPage;
