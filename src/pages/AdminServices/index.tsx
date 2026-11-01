import { Button, Card, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ServiceFilters from './components/ServiceFilters';
import ServiceTable from './components/ServiceTable';
import ServiceFormModal from './components/ServiceFormModal';
import ServiceDetailModal from './components/ServiceDetailModal';
import { useServiceManagement } from './components/useServiceManagement';
import { PageWrapper } from './components/styles';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

const AdminServicesPage = () => {
  const state = useServiceManagement({ pageSize: PAGE_SIZE });

  return (
    <PageWrapper>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space
            style={{ justifyContent: 'space-between', width: '100%' }}
            wrap
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Quản lý dịch vụ
              </Title>
              <Text type="secondary">
                Quản lý danh mục, giá niêm yết và trạng thái cung cấp dịch vụ
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={state.openCreateForm}
            >
              Thêm dịch vụ
            </Button>
          </Space>

          <ServiceFilters
            searchDraft={state.searchDraft}
            category={state.category}
            status={state.status}
            loading={state.loading}
            onSearchChange={state.handleSearchChange}
            onSearchSubmit={state.applySearch}
            onCategoryChange={state.handleCategoryChange}
            onStatusChange={state.handleStatusChange}
            onReset={state.resetFilters}
            onRefresh={state.retryList}
          />

          <ServiceTable
            services={state.services}
            loading={state.loading}
            error={state.listError}
            hasFilters={state.hasFilters}
            page={state.page}
            pageSize={PAGE_SIZE}
            statusPendingId={state.statusPendingId}
            onPageChange={state.setPage}
            onRetry={state.retryList}
            onDetail={state.openDetail}
            onEdit={state.openEditForm}
            onChangeStatus={state.changeStatus}
          />
        </Space>
      </Card>

      <ServiceFormModal
        open={state.formOpen}
        editingService={state.editingService}
        loading={state.formLoading}
        saving={state.saving}
        fieldErrors={state.formFieldErrors}
        onCancel={state.closeForm}
        onSubmit={state.submitForm}
      />

      <ServiceDetailModal
        open={state.detailOpen}
        service={state.detailService}
        loading={state.detailLoading}
        error={state.detailError}
        onRetry={state.retryDetail}
        onClose={state.closeDetail}
      />
    </PageWrapper>
  );
};

export default AdminServicesPage;
