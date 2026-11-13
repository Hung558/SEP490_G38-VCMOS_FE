import { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { toast } from 'sonner';
import type { GroomingNote, GroomingNoteDraft } from '@/types';
import AppointmentServiceService, {
  extractApiError,
  GROOMING_NOTE_FIELDS,
  GROOMING_NOTE_TEXT_MAX,
  GROOMING_PHOTO_FIELDS,
  GROOMING_PHOTO_MIME_TYPES,
  validateGroomingPhoto,
} from '@/services/AppointmentServiceService';
import GroomingNoteDetails from './GroomingNoteDetails';

const { Text } = Typography;
type PhotoField = (typeof GROOMING_PHOTO_FIELDS)[number][0];

interface GroomingNoteModalProps {
  serviceId: string;
  mode: 'create' | 'view';
  canCreate: boolean;
  queueNote?: GroomingNote | null;
  onClose: () => void;
  onQueueSync: (note?: GroomingNote) => Promise<void>;
}

const GroomingNoteModal = ({
  serviceId,
  mode,
  canCreate,
  queueNote,
  onClose,
  onQueueSync,
}: GroomingNoteModalProps) => {
  const formId = useId();
  const savingRef = useRef(false);
  const [draft, setDraft] = useState<GroomingNoteDraft>({});
  const [photoErrors, setPhotoErrors] = useState<
    Partial<Record<PhotoField, string>>
  >({});
  const [note, setNote] = useState<GroomingNote>();
  const [loading, setLoading] = useState(mode === 'view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (mode !== 'view') return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    AppointmentServiceService.getGroomingNote(serviceId, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!data?.groomingNote)
          throw new Error('Không tìm thấy ghi chú đã lưu.');
        if (!controller.signal.aborted) setNote(data.groomingNote);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(extractApiError(err, 'Không thể tải ghi chú spa').message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, mode, serviceId]);

  const selectPhoto = (field: PhotoField, file?: File) => {
    if (!file || savingRef.current) return;
    const invalid = validateGroomingPhoto(file);
    setPhotoErrors(prev => ({ ...prev, [field]: invalid }));
    if (!invalid) setDraft(prev => ({ ...prev, [field]: file }));
  };

  const removePhoto = (field: PhotoField) => {
    setDraft(prev => ({ ...prev, [field]: undefined }));
    setPhotoErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const submit = async () => {
    if (mode !== 'create' || !canCreate || note || savingRef.current) return;
    if (Object.values(photoErrors).some(Boolean)) return;
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const { data } = await AppointmentServiceService.createGroomingNote(
        serviceId,
        draft
      );
      if (!data?.groomingNote)
        throw new Error('Máy chủ chưa xác nhận đã lưu ghi chú spa.');
      setNote(data.groomingNote);
      setDraft({});
      toast.success('Đã lưu ghi chú spa.');
      await onQueueSync(data.groomingNote);
    } catch (err: unknown) {
      const { message, statusCode } = extractApiError(
        err,
        'Không thể lưu ghi chú spa'
      );
      setError(message);
      if (statusCode === 409) {
        let existing: GroomingNote | undefined;
        try {
          const { data } =
            await AppointmentServiceService.getGroomingNote(serviceId);
          existing = data?.groomingNote;
          if (existing) {
            setNote(existing);
            setError(`${message}. Đang hiển thị ghi chú đã có trên hệ thống.`);
          }
        } catch {
          // Có thể ghi chú chưa tồn tại (ví dụ ca đổi trạng thái); giữ bản nháp.
        }
        await onQueueSync(existing);
      } else if (statusCode === 403 || statusCode === 404) {
        await onQueueSync();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const displayedNote = note ?? (mode === 'create' ? queueNote : undefined);
  const isEditing = mode === 'create' && !displayedNote;
  const close = () => {
    if (!savingRef.current) onClose();
  };

  return (
    <Modal
      open
      title={isEditing ? 'Tạo ghi chú spa' : 'Xem ghi chú spa'}
      onCancel={close}
      closable={!saving}
      maskClosable={false}
      footer={
        <Space>
          <Button disabled={saving} onClick={close}>
            Đóng
          </Button>
          {isEditing && (
            <Button
              type="primary"
              htmlType="submit"
              form={formId}
              loading={saving}
              disabled={!canCreate || Object.values(photoErrors).some(Boolean)}
            >
              Lưu ghi chú
            </Button>
          )}
        </Space>
      }
    >
      {error && (
        <Alert
          type={displayedNote ? 'warning' : 'error'}
          showIcon
          message={error}
          style={{ marginBottom: 12 }}
          action={
            mode === 'view' ? (
              <Button size="small" onClick={() => setAttempt(n => n + 1)}>
                Thử lại
              </Button>
            ) : undefined
          }
        />
      )}
      {loading && <Skeleton active />}
      {displayedNote && <GroomingNoteDetails note={displayedNote} />}
      {isEditing && (
        <Form
          id={formId}
          layout="vertical"
          onFinish={submit}
          disabled={saving || !canCreate}
        >
          {!canCreate && (
            <Alert
              type="warning"
              showIcon
              message="Không thể lưu ghi chú với trạng thái hiện tại của ca."
            />
          )}
          <Text type="secondary">
            Mỗi ca chỉ lưu một ghi chú spa. Ghi chú không thể chỉnh sửa sau khi
            lưu.
          </Text>
          {GROOMING_NOTE_FIELDS.map(([field, label]) => (
            <Form.Item key={field} label={label} htmlFor={`${formId}-${field}`}>
              <Input.TextArea
                id={`${formId}-${field}`}
                rows={2}
                maxLength={GROOMING_NOTE_TEXT_MAX}
                showCount
                value={draft[field] ?? ''}
                onChange={event => {
                  const value = event.target.value;
                  setDraft(prev => ({ ...prev, [field]: value }));
                }}
              />
            </Form.Item>
          ))}
          {GROOMING_PHOTO_FIELDS.map(([field, label]) => (
            <Form.Item
              key={field}
              label={label}
              htmlFor={`${formId}-${field}`}
              validateStatus={photoErrors[field] ? 'error' : undefined}
              help={
                photoErrors[field] ? (
                  <span role="alert">{photoErrors[field]}</span>
                ) : undefined
              }
              extra="JPEG, PNG hoặc WebP, dưới 5 MiB mỗi ảnh."
            >
              <Space wrap>
                <input
                  type="file"
                  id={`${formId}-${field}`}
                  accept={GROOMING_PHOTO_MIME_TYPES.join(',')}
                  disabled={saving || !canCreate}
                  onChange={event => {
                    selectPhoto(field, event.currentTarget.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
                {(draft[field] || photoErrors[field]) && (
                  <Space wrap>
                    {draft[field] && <Text>{draft[field]?.name}</Text>}
                    <Button size="small" onClick={() => removePhoto(field)}>
                      Bỏ {label.toLowerCase()}
                    </Button>
                  </Space>
                )}
              </Space>
            </Form.Item>
          ))}
        </Form>
      )}
    </Modal>
  );
};

export default GroomingNoteModal;
