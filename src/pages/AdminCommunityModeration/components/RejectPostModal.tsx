import { useRef, useState } from 'react';
import { Alert, Input, Modal, Typography } from 'antd';
import { toast } from 'sonner';
import CommunityModerationService, {
  MODERATION_NOTE_MAX_LENGTH,
  validateModerationNote,
  type ModerationPost,
} from '@/services/CommunityModerationService';
import { readCommunityError } from '@/services/CommunityService';
import { userLine } from './labels';
import { NoteField } from './styles';

const { Text } = Typography;

interface RejectPostModalProps {
  post: ModerationPost | null;
  onClose: () => void;
  /** The list changed (rejected, or already handled by someone else) */
  onDone: () => void;
}

/** UC-58: rejecting hides the post and needs a reason (MSG22) the author will read */
const RejectPostModal = ({ post, onClose, onDone }: RejectPostModalProps) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const close = () => {
    if (savingRef.current) return;
    setNote('');
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    if (!post || savingRef.current) return;
    const invalid = validateModerationNote('Reject', note);
    if (invalid) {
      setError(invalid);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const result = await CommunityModerationService.moderatePost(
        post._id,
        'Reject',
        note
      );
      toast.success(result.message || 'Đã từ chối và ẩn bài viết.');
      savingRef.current = false;
      setNote('');
      onDone();
    } catch (failure) {
      const { status, message } = readCommunityError(
        failure,
        'Chưa từ chối được bài viết. Vui lòng thử lại.'
      );
      if (status === 409 || status === 404) {
        toast.warning(message);
        savingRef.current = false;
        setNote('');
        onDone();
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
      open={Boolean(post)}
      title="Từ chối bài viết"
      okText="Từ chối và ẩn bài"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading: saving }}
      cancelButtonProps={{ disabled: saving }}
      onOk={submit}
      onCancel={close}
      maskClosable={!saving}
      destroyOnHidden
    >
      <Text type="secondary">
        Bài của {userLine(post?.authorId)} sẽ chuyển sang “Đã ẩn”. Tác giả thấy
        lý do trong “Bài viết của tôi”.
      </Text>
      <NoteField>
        <label htmlFor="moderation-reject-note">
          <Text strong>Lý do từ chối (bắt buộc)</Text>
        </label>
        <Input.TextArea
          id="moderation-reject-note"
          value={note}
          rows={4}
          maxLength={MODERATION_NOTE_MAX_LENGTH}
          showCount
          status={error ? 'error' : undefined}
          aria-invalid={Boolean(error)}
          placeholder="Ví dụ: bài có thông tin giá dịch vụ, nội dung không phù hợp…"
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

export default RejectPostModal;
