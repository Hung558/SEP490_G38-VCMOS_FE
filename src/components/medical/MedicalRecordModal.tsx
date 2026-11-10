import { useEffect, useState } from 'react';
import { Alert, Empty, Modal, Skeleton, Space } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { MedicalRecord } from '@/types';
import MedicalRecordService from '@/services/MedicalRecordService';
import { extractApiError } from '@/services/AppointmentServiceService';
import MedicalRecordView from './MedicalRecordView';

interface MedicalRecordModalProps {
  /** Mở modal cho dịch vụ này; null là đóng */
  appointmentServiceId: string | null;
  onClose: () => void;
}

/** Xem bệnh án SOAP của một ca khám: chủ nuôi (BR-23), lễ tân, Admin */
const MedicalRecordModal = ({
  appointmentServiceId,
  onClose,
}: MedicalRecordModalProps) => {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentServiceId) return;
    const controller = new AbortController();
    setRecord(null);
    setNotFound(false);
    setError(null);
    setLoading(true);
    MedicalRecordService.getByService(appointmentServiceId, {
      signal: controller.signal,
    })
      .then(setRecord)
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        const { message, statusCode } = extractApiError(
          err,
          'Không thể tải bệnh án'
        );
        // 404: the exam has not started, so there is no record yet
        if (statusCode === 404) setNotFound(true);
        else setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appointmentServiceId]);

  return (
    <Modal
      title={
        <Space>
          <MedicineBoxOutlined style={{ color: '#0d9488' }} />
          <span>Bệnh án SOAP</span>
        </Space>
      }
      open={Boolean(appointmentServiceId)}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={760}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : notFound ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có bệnh án: bác sĩ chưa bắt đầu ca khám này."
        />
      ) : record ? (
        <MedicalRecordView record={record} />
      ) : null}
    </Modal>
  );
};

export default MedicalRecordModal;
