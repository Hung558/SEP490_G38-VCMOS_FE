import { Alert, Button, Descriptions, Modal, Spin, Tag } from 'antd';
import {
  formatServiceDuration,
  formatServicePrice,
  serviceCategoryLabels,
  serviceStatusLabels,
  type Service,
} from '@/services/ServiceService';

interface Props {
  open: boolean;
  service: Service | null;
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

const ServiceDetailModal = ({
  open,
  service,
  loading,
  error,
  onRetry,
  onClose,
}: Props) => (
  <Modal
    open={open}
    title="Chi tiết dịch vụ"
    footer={null}
    onCancel={onClose}
    width={640}
  >
    <Spin spinning={loading}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải chi tiết dịch vụ"
          description={error}
          action={
            <Button size="small" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      ) : service ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Mã dịch vụ">
            {service.code || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Tên dịch vụ">
            {service.name || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Danh mục">
            {serviceCategoryLabels[service.category] || service.category || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Thời lượng">
            {formatServiceDuration(service.defaultDuration)}
          </Descriptions.Item>
          <Descriptions.Item label="Giá niêm yết">
            {formatServicePrice(service.basePrice)}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={service.status === 'Active' ? 'green' : 'default'}>
              {serviceStatusLabels[service.status] || service.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả">
            {service.description?.trim() || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {formatDateTime(service.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            {formatDateTime(service.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Spin>
  </Modal>
);

export default ServiceDetailModal;
