import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Skeleton } from 'antd';
import dayjs from 'dayjs';
import AiAssessmentService, {
  assessmentPetName,
  readAiAssessmentError,
  type AiAssessment,
} from '@/services/AiAssessmentService';
import AiAssessmentResult from './AiAssessmentResult';

interface AiAssessmentDetailModalProps {
  /** The check to show; null keeps the modal closed */
  assessmentId: string | null;
  onClose: () => void;
  /** Booking from the result; read only without it */
  onBook?: (assessment: AiAssessment, serviceId?: string) => void;
}

/** One saved AI check, read again from GET /ai-assessments/:id */
const AiAssessmentDetailModal: React.FC<AiAssessmentDetailModalProps> = ({
  assessmentId,
  onClose,
  onBook,
}) => {
  const [assessment, setAssessment] = useState<AiAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!assessmentId) return undefined;
    const controller = new AbortController();
    setAssessment(null);
    setError(null);
    AiAssessmentService.getAssessment(assessmentId, {
      signal: controller.signal,
    })
      .then(response => {
        if (!controller.signal.aborted) setAssessment(response.assessment);
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setError(
          readAiAssessmentError(failure, 'Không tải được kết quả đánh giá AI')
            .message
        );
      });
    return () => controller.abort();
  }, [assessmentId, attempt]);

  const title = assessment
    ? `Đánh giá AI · bé ${assessmentPetName(assessment)} · ${dayjs(
        assessment.createdAt
      ).format('DD/MM/YYYY HH:mm')}`
    : 'Kết quả đánh giá AI';

  return (
    <Modal
      open={!!assessmentId}
      title={title}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      width={640}
      destroyOnHidden
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
      ) : assessment ? (
        <AiAssessmentResult
          assessment={assessment}
          showInput
          onBook={
            onBook ? serviceId => onBook(assessment, serviceId) : undefined
          }
        />
      ) : (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}
    </Modal>
  );
};

export default AiAssessmentDetailModal;
