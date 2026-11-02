import { Alert, Button, Popconfirm, Space, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import {
  formatProductPrice,
  productCategoryLabels,
  productStatusLabels,
  type Product,
} from '@/services/ProductService';

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  page: number;
  pageSize: number;
  total: number;
  statusPendingId: string | null;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onDetail: (product: Product) => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

const ProductTable = ({
  products,
  loading,
  error,
  hasFilters,
  page,
  pageSize,
  total,
  statusPendingId,
  onPageChange,
  onRetry,
  onDetail,
  onEdit,
  onToggleStatus,
}: Props) => {
  const columns = useMemo(
    () => [
      {
        title: 'Mã',
        dataIndex: 'code',
        key: 'code',
        width: 130,
      },
      {
        title: 'Tên sản phẩm',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Loại sản phẩm',
        dataIndex: 'category',
        key: 'category',
        width: 160,
        render: (value: Product['category']) =>
          productCategoryLabels[value] || value,
      },
      {
        title: 'Đơn vị tính',
        dataIndex: 'unit',
        key: 'unit',
        width: 120,
      },
      {
        title: 'Đơn giá',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 150,
        render: (value?: number) => formatProductPrice(value),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (value: Product['status']) => (
          <Tag color={value === 'Active' ? 'green' : 'default'}>
            {productStatusLabels[value] || value}
          </Tag>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 260,
        render: (_: unknown, product: Product) => {
          const isActive = product.status === 'Active';
          return (
            <Space wrap>
              <Button icon={<EyeOutlined />} onClick={() => onDetail(product)}>
                Chi tiết
              </Button>
              <Button icon={<EditOutlined />} onClick={() => onEdit(product)}>
                Sửa
              </Button>
              <Popconfirm
                title={
                  isActive
                    ? `Ngừng kinh doanh sản phẩm ${product.name}?`
                    : `Kích hoạt lại sản phẩm ${product.name}?`
                }
                okText={isActive ? 'Ngừng kinh doanh' : 'Kích hoạt'}
                cancelText="Hủy"
                onConfirm={() => onToggleStatus(product)}
              >
                <Button
                  type="link"
                  danger={isActive}
                  loading={statusPendingId === product._id}
                  icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                >
                  {isActive ? 'Ngừng kinh doanh' : 'Kích hoạt'}
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [onDetail, onEdit, onToggleStatus, statusPendingId]
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải danh sách sản phẩm"
          description={error}
          action={
            <Button size="small" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      ) : null}
      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={products}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: t => `${t} sản phẩm`,
        }}
        locale={{
          emptyText: error
            ? 'Không tải được dữ liệu'
            : hasFilters
              ? 'Không có sản phẩm phù hợp bộ lọc'
              : 'Chưa có sản phẩm nào trong hệ thống',
        }}
      />
    </Space>
  );
};

export default ProductTable;
