import { useRef, useState } from 'react';
import { Alert, Input, Modal, Radio, Space, Typography } from 'antd';
import { toast } from 'sonner';
import CommunityModerationService, {
  isResolveNoteRequired,
  MODERATION_NOTE_MAX_LENGTH,
  REPORT_DECISIONS,
  validateResolveNote,
  type ContentReport,
  type ReportDecision,
} from '@/services/CommunityModerationService';
import { readCommunityError } from '@/services/CommunityService';
import { NoteField } from './styles';

const { Text } = Typography;

interface ResolveReportModalProps {
  report: ContentReport | null;
  onClose: () => void;
  /** The list changed (resolved, or already handled by someone else) */
  onDone: () => void;
}

/**
 * Nghiệp vụ 7.1 (UC-59): keep, hide or delete reported content. Every pending
 * report on the same post or comment is closed together.
 */
const ResolveReportModal = ({
  report,
  onClose,
  onDone,
}: ResolveReportModalProps) => {
  const [decision, setDecision] = useState<ReportDecision>('Keep');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const targetLabel =
    report?.targetType === 'Comment' ? 'bình luận' : 'bài viết';
  const noteRequired = isResolveNoteRequired(decision);

  const reset = () => {
    setDecision('Keep');
    setNote('');
    setError(undefined);
  };

  const close = () => {
    if (savingRef.current) return;
    reset();
    onClose();
  };

  const finish = () => {
    savingRef.current = false;
    reset();
    onDone();
  };

  const submit = async () => {
    if (!report || savingRef.current) return;
    const invalid = validateResolveNote(decision, note);
    if (invalid) {
      setError(invalid);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const result = await CommunityModerationService.resolveReport(
        report._id,
        decision,
        note
      );
      toast.success(
        result.resolvedCount > 1
          ? `${result.message} (đã đóng ${result.resolvedCount} báo cáo cùng nội dung).`
          : result.message || 'Đã xử lý báo cáo.'
      );
      finish();
    } catch (failure) {
      const { status, message } = readCommunityError(
        failure,
        'Chưa xử lý được báo cáo. Vui lòng thử lại.'
      );
      if (status === 409 || status === 404) {
        toast.warning(message);
        finish();
        return;
      }
      setError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(report)}
      title={`Xử lý báo cáo ${targetLabel}`}
      okText="Xác nhận"
      cancelText="Hủy"
      okButtonProps={{ danger: decision !== 'Keep', loading: saving }}
      cancelButtonProps={{ disabled: saving }}
      onOk={submit}
      onCancel={close}
      maskClosable={!saving}
      destroyOnHidden
    >
      {report && report.reportCount > 1 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Nội dung này có ${report.reportCount} lượt báo cáo; mọi báo cáo đang chờ sẽ được đóng cùng lúc.`}
        />
      )}
      <Radio.Group
        value={decision}
        onChange={event => {
          setDecision(event.target.value);
          if (error) setError(undefined);
        }}
      >
        <Space direction="vertical">
          {REPORT_DECISIONS.map(item => (
            <Radio key={item.value} value={item.value}>
              <Text strong>{item.label}</Text>{' '}
              <Text type="secondary">{item.hint}</Text>
            </Radio>
          ))}
        </Space>
      </Radio.Group>
      <NoteField>
        <label htmlFor="moderation-resolve-note">
          <Text strong>
            {noteRequired ? 'Lý do (bắt buộc)' : 'Ghi chú (không bắt buộc)'}
          </Text>
        </label>
        <Input.TextArea
          id="moderation-resolve-note"
          value={note}
          rows={3}
          maxLength={MODERATION_NOTE_MAX_LENGTH}
          showCount
          status={error ? 'error' : undefined}
          aria-invalid={Boolean(error)}
          onChange={event => {
            setNote(event.target.value);
            if (error) setError(undefined);
          }}
        />
        {error && (
          <Alert
            type="error"
            showIcon
            message={<span role="alert">{error}</span>}
          />
        )}
      </NoteField>
    </Modal>
  );
};

export default ResolveReportModal;
