import { PageHeader } from '@/components/dashboard';
import { PageWrapper } from './components/styles';
import AdminReportsDashboard from './components/AdminReportsDashboard';

const AdminReportsPage = () => (
  <PageWrapper>
    <PageHeader title="Tổng quan quản trị" />
    <AdminReportsDashboard />
  </PageWrapper>
);
export default AdminReportsPage;
