import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Modal,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { CageAssignment } from '@/types';
import CageAssignmentService, {
  getAssignmentCageLabel,
  getAssignmentCageSize,
} from '@/services/CageAssignmentService';
import { extractApiError } from '@/services/AppointmentServiceService';

interface QueueCageModalProps {
  /** Lịch hẹn cần xem chuồng; null là đóng */
  order: { _id: string; code: string } | null;
  petName?: string;
  onClose: () => void;
}

/**
 * Chuồng thú cưng đang nằm, chỉ để xem (Bác sĩ, Groomer). Nghiệp vụ 4.5: lễ tân
 * xếp và giải phóng chuồng; khi bắt đầu khám hoặc làm dịch vụ BE tự đưa bé ra.
 */
const QueueCageModal = ({ order, petName, onClose }: QueueCageModalProps) => {
  const [assignment, setAssignment] = useState<CageAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [notInCage, setNotInCage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    const controller = new AbortController();
    setAssignment(null);
    setNotInCage(false);
    setError(null);
    setLoading(true);
    CageAssignmentService.getOpenAssignmentByOrder(order._id, {
      signal: controller.signal,
    })
      .then(res => setAssignment(res.data))
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        const { message, statusCode } = extractApiError(
          err,
          'Không thể tải thông tin chuồng'
        );
        if (statusCode === 404) setNotInCage(true);
        else setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [order]);

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined style={{ color: '#1677ff' }} />
          <span>Chuồng của lịch hẹn {order?.code}</span>
        </Space>
      }
      open={Boolean(order)}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : notInCage ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`${petName ? `Bé ${petName}` : 'Thú cưng'} hiện không ở chuồng nào.`}
        />
      ) : assignment ? (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Chuồng">
            {getAssignmentCageLabel(
              typeof assignment.cageId === 'object' ? assignment.cageId : null
            )}{' '}
            (Size{' '}
            {getAssignmentCageSize(
              typeof assignment.cageId === 'object' ? assignment.cageId : null
            )}
            )
          </Descriptions.Item>
          <Descriptions.Item label="Vào chuồng lúc">
            {assignment.assignedAt
              ? dayjs(assignment.assignedAt).format('HH:mm DD/MM/YYYY')
              : '—'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
      {!loading && !error && (
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
          Khi bạn bắt đầu khám hoặc làm dịch vụ, hệ thống tự đưa bé ra khỏi
          chuồng. Lễ tân xếp bé vào chuồng giữa hai dịch vụ và lúc chờ chủ đón.
        </Typography.Paragraph>
      )}
    </Modal>
  );
};

export default QueueCageModal;
