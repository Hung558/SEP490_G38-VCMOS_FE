import { Alert, Button, Descriptions, Modal, Skeleton, Tag } from 'antd';
import dayjs from 'dayjs';
import {
  cageIsolationLabels,
  cageSizeLabels,
  cageStatusColors,
  cageStatusLabels,
  type Cage,
} from '@/services/CageService';

interface CageDetailModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  cage: Cage | null;
  onClose: () => void;
}

const CageDetailModal = ({
  open,
  loading,
  error,
  cage,
  onClose,
}: CageDetailModalProps) => {
  return (
    <Modal
      title={cage ? `Chi tiết chuồng: ${cage.label}` : 'Chi tiết chuồng'}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      destroyOnHidden
      width={600}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải thông tin chuồng"
          description={error}
        />
      ) : cage ? (
        <Descriptions
          bordered
          column={1}
          size="middle"
          style={{ marginTop: 16 }}
        >
          <Descriptions.Item label="Mã chuồng (ID)">
            <code>{cage._id}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Nhãn chuồng">
            <strong>{cage.label}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Kích thước">
            <Tag color="blue">{cageSizeLabels[cage.size] || cage.size}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Khu cách ly">
            {cage.isIsolated ? (
              <Tag color="error">{cageIsolationLabels.true}</Tag>
            ) : (
              <Tag color="default">{cageIsolationLabels.false}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag
              color={cageStatusColors[cage.status] || 'default'}
              style={{ fontWeight: 500 }}
            >
              {cageStatusLabels[cage.status] || cage.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian tạo">
            {cage.createdAt
              ? dayjs(cage.createdAt).format('DD/MM/YYYY HH:mm:ss')
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            {cage.updatedAt
              ? dayjs(cage.updatedAt).format('DD/MM/YYYY HH:mm:ss')
              : '—'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Modal>
  );
};

export default CageDetailModal;
