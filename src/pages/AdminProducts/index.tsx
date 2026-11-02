import { Button, Card, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ProductFilters from './components/ProductFilters';
import ProductTable from './components/ProductTable';
import ProductFormModal from './components/ProductFormModal';
import ProductDetailModal from './components/ProductDetailModal';
import { useProductManagement } from './components/useProductManagement';
import { PageWrapper } from './components/styles';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

const AdminProductsPage = () => {
  const state = useProductManagement({ pageSize: PAGE_SIZE });

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
                Quản lý sản phẩm
              </Title>
              <Text type="secondary">
                Quản lý thuốc điều trị, vắc xin và sản phẩm bán lẻ trong hệ
                thống
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={state.openCreateForm}
            >
              Thêm sản phẩm
            </Button>
          </Space>

          <ProductFilters
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

          <ProductTable
            products={state.products}
            loading={state.loading}
            error={state.listError}
            hasFilters={state.hasFilters}
            page={state.page}
            pageSize={PAGE_SIZE}
            total={state.total}
            statusPendingId={state.statusPendingId}
            onPageChange={state.setPage}
            onRetry={state.retryList}
            onDetail={state.openDetail}
            onEdit={state.openEditForm}
            onToggleStatus={state.toggleStatus}
          />
        </Space>
      </Card>

      <ProductFormModal
        open={state.formOpen}
        editingProduct={state.editingProduct}
        loading={state.formLoading}
        saving={state.saving}
        fieldErrors={state.formFieldErrors}
        onCancel={state.closeForm}
        onSubmit={state.submitForm}
      />

      <ProductDetailModal
        open={state.detailOpen}
        product={state.detailProduct}
        loading={state.detailLoading}
        error={state.detailError}
        onRetry={state.retryDetail}
        onClose={state.closeDetail}
      />
    </PageWrapper>
  );
};

export default AdminProductsPage;
