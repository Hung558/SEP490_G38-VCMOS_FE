import { Alert, Button, Descriptions, Modal, Spin, Tag } from 'antd';
import {
  formatProductPrice,
  productCategoryLabels,
  productStatusLabels,
  type Product,
} from '@/services/ProductService';

interface Props {
  open: boolean;
  product: Product | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

const formatDateTime = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const ProductDetailModal = ({
  open,
  product,
  loading,
  error,
  onRetry,
  onClose,
}: Props) => (
  <Modal
    open={open}
    title="Chi tiết sản phẩm"
    footer={null}
    onCancel={onClose}
    width={600}
  >
    <Spin spinning={loading}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải chi tiết sản phẩm"
          description={error}
          action={
            <Button size="small" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      ) : product ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Mã sản phẩm">
            {product.code || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Tên sản phẩm">
            {product.name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Loại sản phẩm">
            {productCategoryLabels[product.category] || product.category || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Đơn vị tính">
            {product.unit || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Đơn giá">
            {formatProductPrice(product.unitPrice)}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={product.status === 'Active' ? 'green' : 'default'}>
              {productStatusLabels[product.status] || product.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {formatDateTime(product.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            {formatDateTime(product.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Spin>
  </Modal>
);

export default ProductDetailModal;
