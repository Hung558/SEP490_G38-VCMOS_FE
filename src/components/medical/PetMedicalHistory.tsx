import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Empty, Skeleton, Space, Tag } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import type { MedicalRecord } from '@/types';
import MedicalRecordService, {
  getMedicalRecordStatus,
  getRecordDoctorName,
  getRecordServiceName,
  getRecordServiceRef,
  getRecordVisitDate,
} from '@/services/MedicalRecordService';
import { extractApiError } from '@/services/AppointmentServiceService';
import MedicalRecordView from './MedicalRecordView';

interface PetMedicalHistoryProps {
  petId: string;
  /** Ca đang khám: được đánh dấu và không mở sẵn */
  currentServiceId?: string;
  emptyText?: string;
}

/** Tiền sử bệnh của một thú cưng, mới nhất trước (UC-32, BR-23) */
const PetMedicalHistory = ({
  petId,
  currentServiceId,
  emptyText = 'Chưa có lần khám nào được ghi bệnh án.',
}: PetMedicalHistoryProps) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await MedicalRecordService.getPetHistory(petId, {
        signal: controller.signal,
      });
      setRecords(res.records || []);
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      setError(extractApiError(err, 'Không thể tải tiền sử bệnh').message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={
          <Button size="small" onClick={load}>
            Thử lại
          </Button>
        }
      />
    );
  }
  if (records.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    );
  }

  const isCurrent = (record: MedicalRecord) =>
    Boolean(currentServiceId) &&
    getRecordServiceRef(record)?._id === currentServiceId;
  const firstPast = records.find(r => !isCurrent(r));

  return (
    <Collapse
      defaultActiveKey={firstPast ? [firstPast._id] : []}
      items={records.map(record => {
        const status = getMedicalRecordStatus(record.status);
        const visitDate = getRecordVisitDate(record);
        return {
          key: record._id,
          label: (
            <Space wrap size={6}>
              <strong>
                {visitDate ? dayjs(visitDate).format('DD/MM/YYYY') : '—'}
              </strong>
              <span>{getRecordServiceName(record)}</span>
              <span style={{ color: '#64748b' }}>
                BS {getRecordDoctorName(record)}
              </span>
              {isCurrent(record) && <Tag color="blue">Ca đang khám</Tag>}
              <Tag color={status.color}>{status.label}</Tag>
            </Space>
          ),
          children: <MedicalRecordView record={record} showHeader={false} />,
        };
      })}
    />
  );
};

export default PetMedicalHistory;
