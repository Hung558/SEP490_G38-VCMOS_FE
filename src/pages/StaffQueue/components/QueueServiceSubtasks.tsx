import { useEffect, useState } from 'react';
import ServiceSubtasksModal from '@/components/clinicalSubtasks/ServiceSubtasksModal';
import MedicalRecordService, {
  isMedicalRecordLocked,
} from '@/services/MedicalRecordService';
import { extractApiError } from '@/services/AppointmentServiceService';

const QueueServiceSubtasks = ({
  serviceId,
  requesterId,
  active,
  onClose,
}: {
  serviceId: string;
  requesterId?: string;
  active: boolean;
  onClose: () => void;
}) => {
  const [permission, setPermission] = useState<
    'loading' | 'allowed' | 'locked' | 'error'
  >('loading');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!active || !requesterId) return;
    const controller = new AbortController();
    MedicalRecordService.getByService(serviceId, { signal: controller.signal })
      .then(record => {
        if (!controller.signal.aborted)
          setPermission(isMedicalRecordLocked(record) ? 'locked' : 'allowed');
      })
      .catch(err => {
        if (!controller.signal.aborted)
          setPermission(
            extractApiError(err).statusCode === 404 ? 'allowed' : 'error'
          );
      });
    return () => controller.abort();
  }, [active, requesterId, revision, serviceId]);

  return (
    <ServiceSubtasksModal
      serviceId={serviceId}
      requesterId={requesterId}
      canCreate={active && !!requesterId && permission === 'allowed'}
      createHint={
        active && requesterId
          ? {
              loading: 'Đang kiểm tra trạng thái bệnh án…',
              allowed: undefined,
              locked: 'Bệnh án đã khóa, không thể tạo thêm chỉ định.',
              error: 'Không thể kiểm tra trạng thái bệnh án để tạo chỉ định.',
            }[permission]
          : undefined
      }
      onRetryCreate={
        permission === 'error'
          ? () => {
              setPermission('loading');
              setRevision(n => n + 1);
            }
          : undefined
      }
      onClose={onClose}
    />
  );
};

export default QueueServiceSubtasks;
