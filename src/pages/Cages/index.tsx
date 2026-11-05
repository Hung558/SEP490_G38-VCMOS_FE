import { Button, Card, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { PageWrapper } from './components/styles';
import { useCageManagement } from './components/useCageManagement';
import CageFilters from './components/CageFilters';
import CageTable from './components/CageTable';
import CageDetailModal from './components/CageDetailModal';
import CageFormModal from './components/CageFormModal';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

const CagesPage = () => {
  const state = useCageManagement({ pageSize: PAGE_SIZE });

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
                Quản lý chuồng
              </Title>
              <Text type="secondary">
                Theo dõi danh sách chuồng, kích thước, trạng thái và khu vực
                cách ly của phòng khám
              </Text>
            </div>
            {state.isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={state.openCreateForm}
              >
                Thêm chuồng
              </Button>
            )}
          </Space>

          <CageFilters
            status={state.status}
            size={state.size}
            isIsolated={state.isIsolated}
            sort={state.sort}
            loading={state.loading}
            hasFilters={state.hasFilters}
            onStatusChange={state.handleFilterStatus}
            onSizeChange={state.handleFilterSize}
            onIsolationChange={state.handleFilterIsolated}
            onSortChange={state.handleSort}
            onReset={state.resetFilters}
            onRefresh={state.retryList}
          />

          <CageTable
            cages={state.cages}
            loading={state.loading}
            error={state.listError}
            hasFilters={state.hasFilters}
            page={state.page}
            pageSize={PAGE_SIZE}
            total={state.total}
            isAdmin={state.isAdmin}
            onPageChange={state.setPage}
            onRetry={state.retryList}
            onResetFilters={state.resetFilters}
            onDetail={state.openDetail}
            onEdit={state.openEditForm}
          />
        </Space>
      </Card>

      <CageDetailModal
        open={state.detailOpen}
        loading={state.detailLoading}
        error={state.detailError}
        cage={state.detailCage}
        onClose={state.closeDetail}
      />

      {state.isAdmin && (
        <CageFormModal
          open={state.formOpen}
          mode={state.formMode}
          editingCage={state.editingCage}
          saving={state.saving}
          fieldErrors={state.formFieldErrors}
          generalError={state.formGeneralError}
          onCancel={state.closeForm}
          onSubmit={state.submitForm}
        />
      )}
    </PageWrapper>
  );
};

export default CagesPage;
