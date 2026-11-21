import { useRef, useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import { toast } from 'sonner';
import CommunityService, {
  readCommunityError,
  REPORT_REASON_MAX_LENGTH,
  REPORT_TARGET_LABELS,
  validateReportReason,
  type ReportTargetType,
} from '@/services/CommunityService';

const { Text } = Typography;

interface ReportModalProps {
  target: { type: ReportTargetType; id: string } | null;
  onClose: () => void;
}

/**
 * Nghiệp vụ 3.4: a pet owner reports a post or a comment; Admin then keeps,
 * hides or deletes it (7.1). The BE refuses own content and a second report.
 */
const ReportModal = ({ target, onClose }: ReportModalProps) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const label = target ? REPORT_TARGET_LABELS[target.type] : '';

  const close = () => {
    if (sendingRef.current) return;
    setReason('');
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    if (!target || sendingRef.current) return;
    const invalid = validateReportReason(reason);
    if (invalid) {
      setError(invalid);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(undefined);
    try {
      const result = await CommunityService.reportContent(
        target.type,
        target.id,
        reason
      );
      toast.success(result.message || 'Đã gửi báo cáo đến quản trị viên.');
      sendingRef.current = false;
      close();
    } catch (failure) {
      setError(
        readCommunityError(failure, 'Chưa gửi được báo cáo. Vui lòng thử lại.')
          .message
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <Modal
      open={Boolean(target)}
      title={`Báo cáo ${label} vi phạm`}
      okText="Gửi báo cáo"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading: sending }}
      cancelButtonProps={{ disabled: sending }}
      onOk={submit}
      onCancel={close}
      maskClosable={!sending}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Quản trị viên sẽ xem báo cáo và quyết định giữ, ẩn hoặc xóa nội dung.
      </Text>
      <label htmlFor="community-report-reason">
        <Text strong>Lý do báo cáo</Text>
      </label>
      {/* showCount sits 22px under the box: keep it off the footer */}
      <div style={{ margin: '6px 0 24px' }}>
        <Input.TextArea
          id="community-report-reason"
          value={reason}
          rows={4}
          maxLength={REPORT_REASON_MAX_LENGTH}
          showCount
          placeholder="Ví dụ: quảng cáo, ngôn từ không phù hợp, thông tin sai lệch…"
          status={error ? 'error' : undefined}
          aria-invalid={Boolean(error)}
          onChange={event => {
            setReason(event.target.value);
            if (error) setError(undefined);
          }}
        />
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{error}</span>}
          style={{ marginTop: 28 }}
        />
      )}
    </Modal>
  );
};

export default ReportModal;
