import { Alert, Descriptions, Modal, Spin, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { CageAssignment } from '@/types';
import {
  getAssignmentCageLabel,
  getAssignmentCageSize,
  getAssignmentOperatorName,
  getAssignmentOrderCode,
} from '@/services/CageAssignmentService';

const { Text } = Typography;

interface CageAssignmentDetailModalProps {
  open: boolean;
  assignment: CageAssignment | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

const CageAssignmentDetailModal = ({
  open,
  assignment,
  loading = false,
  error = null,
  onClose,
}: CageAssignmentDetailModalProps) => {
  const cage =
    typeof assignment?.cageId === 'object' ? assignment.cageId : null;
  const operator =
    typeof assignment?.assignedById === 'object'
      ? assignment.assignedById
      : null;

  return (
    <Modal
      title="Chi tiết phân công chuồng"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Đang tải chi tiết phân công...</Text>
          </div>
        </div>
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải chi tiết phân công chuồng"
          description={error}
          style={{ marginTop: 16 }}
        />
      ) : assignment ? (
        <Descriptions
          bordered
          column={2}
          size="small"
          style={{ marginTop: 16 }}
        >
          <Descriptions.Item label="Mã chuồng">
            <Text strong style={{ color: '#0958d9' }}>
              {getAssignmentCageLabel(assignment.cageId)}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Kích thước">
            Size {getAssignmentCageSize(assignment.cageId)}
          </Descriptions.Item>

          <Descriptions.Item label="Khu cách ly">
            {cage?.isIsolated ? (
              <Tag color="warning">Khu cách ly</Tag>
            ) : (
              <Tag color="blue">Khu thường</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Mã lịch hẹn">
            <Text strong>{getAssignmentOrderCode(assignment.orderId)}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Người phân công">
            {getAssignmentOperatorName(assignment.assignedById)}
          </Descriptions.Item>

          <Descriptions.Item label="Chức vụ">
            {operator?.role || 'Lễ tân'}
          </Descriptions.Item>

          <Descriptions.Item label="Thời gian phân công">
            {assignment.assignedAt
              ? dayjs(assignment.assignedAt).format('HH:mm:ss DD/MM/YYYY')
              : '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Trạng thái">
            {assignment.releasedAt ? (
              <Tag color="default">Đã trả chuồng</Tag>
            ) : (
              <Tag color="green">Đang sử dụng</Tag>
            )}
          </Descriptions.Item>

          {assignment.releasedAt && (
            <Descriptions.Item label="Thời gian trả chuồng" span={2}>
              {dayjs(assignment.releasedAt).format('HH:mm:ss DD/MM/YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : null}
    </Modal>
  );
};

export default CageAssignmentDetailModal;
