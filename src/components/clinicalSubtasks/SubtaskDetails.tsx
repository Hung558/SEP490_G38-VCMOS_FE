import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Image, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import { extractApiError } from '@/services/AppointmentServiceService';
import { readReceptionIntake } from '@/services/AppointmentOrderService';
import SubtaskRequestService, {
  populated,
  safeSubtaskImageUrl,
  type SubtaskRequest,
} from '@/services/SubtaskRequestService';

const { Paragraph } = Typography;

export const SubtaskDetails = ({
  task,
  showIntake = false,
}: {
  task: SubtaskRequest;
  showIntake?: boolean;
}) => {
  const order = populated(populated(task.appointmentServiceId)?.orderId);
  const intake = showIntake ? readReceptionIntake(order?.intake) : undefined;
  const image = safeSubtaskImageUrl(task.resultImageUrl);
  return (
    <Descriptions size="small" column={1} bordered>
      <Descriptions.Item label="Hướng dẫn">
        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
          {task.instructions || 'Không có'}
        </Paragraph>
      </Descriptions.Item>
      {showIntake && order?.note && (
        <Descriptions.Item label="Ghi chú lịch hẹn">
          {order.note}
        </Descriptions.Item>
      )}
      {intake && (
        <Descriptions.Item label="Phiếu tiếp nhận">
          <div>Triệu chứng: {intake.symptoms}</div>
          <div>Tình trạng ban đầu: {intake.initialCondition}</div>
        </Descriptions.Item>
      )}
      {task.status === 'Completed' && (
        <>
          <Descriptions.Item label="Kết quả">
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {task.resultText || 'Không có ghi chú kết quả'}
            </Paragraph>
          </Descriptions.Item>
          {image && (
            <Descriptions.Item label="Ảnh kết quả">
              <Image
                src={image}
                alt="Ảnh kết quả cận lâm sàng"
                width={160}
                referrerPolicy="no-referrer"
              />
            </Descriptions.Item>
          )}
          {task.completedAt && (
            <Descriptions.Item label="Hoàn tất lúc">
              {dayjs(task.completedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          )}
        </>
      )}
    </Descriptions>
  );
};

export const SubtaskDetailLoader = ({
  id,
  showIntake,
}: {
  id: string;
  showIntake?: boolean;
}) => {
  const [task, setTask] = useState<SubtaskRequest>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    SubtaskRequestService.get(id, controller.signal)
      .then(({ data }) => {
        if (!data || data._id !== id)
          throw new Error('Không nhận được chi tiết hợp lệ.');
        if (!controller.signal.aborted) setTask(data);
      })
      .catch(err => {
        if (!controller.signal.aborted)
          setError(extractApiError(err, 'Không tải được chi tiết.').message);
      });
    return () => controller.abort();
  }, [id, revision]);

  if (error)
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={
          <Button
            size="small"
            onClick={() => {
              setError(undefined);
              setRevision(n => n + 1);
            }}
          >
            Thử lại
          </Button>
        }
      />
    );
  return task ? (
    <SubtaskDetails task={task} showIntake={showIntake} />
  ) : (
    <Skeleton active />
  );
};
