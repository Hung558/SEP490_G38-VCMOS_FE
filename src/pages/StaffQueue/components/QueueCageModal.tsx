import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Modal,
  Skeleton,
  Space,
} from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'sonner';
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

/** Chuồng thú cưng đang nằm và nút đưa bé ra khỏi chuồng (Bác sĩ, Groomer) */
const QueueCageModal = ({ order, petName, onClose }: QueueCageModalProps) => {
  const [assignment, setAssignment] = useState<CageAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [notInCage, setNotInCage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

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

  const release = async () => {
    if (!assignment || releasing) return;
    setReleasing(true);
    try {
      const res = await CageAssignmentService.releaseAssignment(assignment._id);
      toast.success(res.message || 'Đã đưa thú cưng ra khỏi chuồng');
      onClose();
    } catch (err: unknown) {
      const { message } = extractApiError(err, 'Không thể giải phóng chuồng');
      toast.error(message);
    } finally {
      setReleasing(false);
    }
  };

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
        assignment
          ? [
              <Button key="close" onClick={onClose} disabled={releasing}>
                Đóng
              </Button>,
              <Button
                key="release"
                type="primary"
                loading={releasing}
                onClick={release}
              >
                Đưa ra khỏi chuồng
              </Button>,
            ]
          : [
              <Button key="close" onClick={onClose}>
                Đóng
              </Button>,
            ]
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
    </Modal>
  );
};

export default QueueCageModal;
