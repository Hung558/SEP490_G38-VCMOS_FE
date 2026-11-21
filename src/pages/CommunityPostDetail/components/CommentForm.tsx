import { useRef, useState } from 'react';
import { Alert, Button, Input } from 'antd';
import {
  COMMENT_MAX_LENGTH,
  readCommunityError,
  validateCommentContent,
} from '@/services/CommunityService';
import { CommentFormWrapper } from './styles';

interface CommentFormProps {
  id: string;
  label: string;
  placeholder: string;
  submitText: string;
  /** Throws the BE error; the form shows it and keeps the text */
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const CommentForm = ({
  id,
  label,
  placeholder,
  submitText,
  onSubmit,
  onCancel,
  autoFocus,
}: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const submit = async () => {
    if (sendingRef.current) return;
    const invalid = validateCommentContent(content);
    if (invalid) {
      setError(invalid);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(undefined);
    try {
      await onSubmit(content);
      setContent('');
    } catch (failure) {
      setError(
        readCommunityError(
          failure,
          'Chưa gửi được bình luận. Vui lòng thử lại.'
        ).message
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <CommentFormWrapper>
      <Input.TextArea
        id={id}
        aria-label={label}
        value={content}
        placeholder={placeholder}
        autoSize={{ minRows: 2, maxRows: 6 }}
        maxLength={COMMENT_MAX_LENGTH}
        showCount
        autoFocus={autoFocus}
        disabled={sending}
        status={error ? 'error' : undefined}
        aria-invalid={Boolean(error)}
        onChange={event => {
          setContent(event.target.value);
          if (error) setError(undefined);
        }}
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{error}</span>}
          style={{ marginTop: 18 }}
        />
      )}
      <div className="comment-form-actions">
        {onCancel && (
          <Button onClick={onCancel} disabled={sending}>
            Hủy
          </Button>
        )}
        <Button
          type="primary"
          loading={sending}
          disabled={!content.trim()}
          onClick={submit}
        >
          {submitText}
        </Button>
      </div>
    </CommentFormWrapper>
  );
};

export default CommentForm;
