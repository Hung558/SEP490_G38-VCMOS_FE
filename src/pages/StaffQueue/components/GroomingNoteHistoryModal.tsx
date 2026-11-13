import { useEffect, useState } from 'react';
import { Alert, Button, Collapse, Empty, Modal, Skeleton } from 'antd';
import dayjs from 'dayjs';
import type { GroomingNoteService } from '@/types';
import AppointmentServiceService, {
  extractApiError,
  getAppointmentServiceName,
  getQueueOrder,
} from '@/services/AppointmentServiceService';
import GroomingNoteDetails from './GroomingNoteDetails';

const GroomingNoteHistoryModal = ({ onClose }: { onClose: () => void }) => {
  const [items, setItems] = useState<GroomingNoteService[]>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    AppointmentServiceService.listMyGroomingNotes({ signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setItems(data ?? []);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            extractApiError(err, 'Không thể tải lịch sử ghi chú spa').message
          );
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <Modal
      open
      title="Lịch sử ghi chú spa"
      onCancel={onClose}
      footer={null}
      width={680}
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => setAttempt(n => n + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : !items ? (
        <Skeleton active />
      ) : !items.length ? (
        <Empty
          description="Chưa có ghi chú spa."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Collapse
          items={items.map(item => {
            const details = [
              getAppointmentServiceName(item.serviceId),
              getQueueOrder(item)?.code,
            ];
            if (item.groomingNote.createdAt)
              details.push(
                dayjs(item.groomingNote.createdAt).format('HH:mm DD/MM/YYYY')
              );
            return {
              key: item._id,
              label: details.filter(Boolean).join(' · '),
              children: <GroomingNoteDetails note={item.groomingNote} />,
            };
          })}
        />
      )}
    </Modal>
  );
};

export default GroomingNoteHistoryModal;
