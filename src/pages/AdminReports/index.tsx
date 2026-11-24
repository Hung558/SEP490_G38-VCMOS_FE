import { PageHeader } from '@/components/dashboard';
import { PageWrapper } from './components/styles';
import AdminReportsDashboard from './components/AdminReportsDashboard';

const AdminReportsPage = () => (
  <PageWrapper>
    <PageHeader
      title="Tổng quan quản trị"
      subtitle="Doanh thu, hoạt động vận hành và quầy lễ tân."
    />
    <AdminReportsDashboard />
  </PageWrapper>
);
export default AdminReportsPage;
