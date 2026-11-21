import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Space } from 'antd';
import PetService from '@/services/PetService';
import type { Pet } from '@/types';
import CommunityPostService, {
  createPostDraft,
  readCommunityPostError,
  validatePostDraft,
} from '@/services/CommunityPostService';
import type {
  CommunityPost,
  CommunityPostDraft,
  CommunityPostErrors,
} from '@/services/CommunityPostService';
import PostImageInput from './PostImageInput';

// K4 (21/11): the editor writes discussions only. A timeline share is built by
// the BE from the pet's finished visits ("Chia sẻ hành trình" on the pet
// profile), so its milestones are never typed by hand (BR-18).

interface Props {
  post?: CommunityPost;
  onSaved: (post: CommunityPost) => void;
  onClose: () => void;
}

export default function PostEditor({ post, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState(() => createPostDraft(post));
  const [errors, setErrors] = useState<CommunityPostErrors>({});
  const [error, setError] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string>();
  const [retryPets, setRetryPets] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [modal, contextHolder] = Modal.useModal();

  useEffect(() => {
    let active = true;
    setPetsLoading(true);
    setPetsError(undefined);
    const load = async () => {
      const all: Pet[] = [];
      let page = 1;
      while (active) {
        const result = await PetService.listPets({
          status: 'Active',
          page,
          limit: 100,
        });
        all.push(...result.items.filter(pet => pet.status === 'Active'));
        if (page >= result.totalPages || !result.items.length) break;
        page++;
      }
      if (active) setPets(all);
    };
    load()
      .catch(failure => {
        if (active)
          setPetsError(
            readCommunityPostError(
              failure,
              'Không tải được danh sách thú cưng.'
            ).message
          );
      })
      .finally(() => {
        if (active) setPetsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryPets]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (patch: Partial<CommunityPostDraft>) => {
    setDirty(true);
    setDraft(value => ({ ...value, ...patch }));
    setErrors({});
  };
  const close = () => {
    if (inFlight.current) return;
    if (!dirty) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Bỏ nội dung chưa lưu?',
      content: 'Nội dung và ảnh bạn vừa chọn chưa được gửi.',
      okText: 'Bỏ thay đổi',
      cancelText: 'Tiếp tục soạn',
      onOk: onClose,
    });
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || locked) return;
    const validation = validatePostDraft(draft, post);
    setErrors(validation);
    setError(undefined);
    if (Object.keys(validation).length) {
      setError(
        'Hãy kiểm tra các trường được đánh dấu bên dưới. Nội dung chưa được gửi.'
      );
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      );
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const result = post
        ? await CommunityPostService.update(post, draft)
        : await CommunityPostService.create(draft);
      setDirty(false);
      onSaved(result.post);
    } catch (failure) {
      const result = readCommunityPostError(
        failure,
        'Chưa lưu được bài viết. Vui lòng thử lại; nội dung và ảnh vẫn được giữ nguyên.'
      );
      setError(result.message);
      setErrors(result.fields);
      if (result.status === 409 || result.status === 404) setLocked(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const fieldError = (field: string) =>
    errors[field] && (
      <p
        id={`post-${field}-error`}
        className="community-field-error"
        role="alert"
      >
        {errors[field]}
      </p>
    );
  const existingPet = typeof post?.petId === 'object' ? post.petId : undefined;

  return (
    <Modal
      open
      title={post ? 'Sửa bài viết đang chờ duyệt' : 'Viết bài mới'}
      width={880}
      onCancel={close}
      footer={null}
      maskClosable={false}
      closable={!saving}
      keyboard={!saving}
    >
      {contextHolder}
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="community-post-form"
      >
        <p className="community-help">
          Bài mới cần được duyệt trước khi đăng. Chỉ bài đang chờ duyệt mới có
          thể sửa hoặc xóa. Muốn chia sẻ hành trình khám của bé? Mở hồ sơ thú
          cưng và bấm “Chia sẻ hành trình”.
        </p>
        {error && (
          <Alert
            type="error"
            showIcon
            message={<span role="alert">{error}</span>}
          />
        )}
        {locked && (
          <Alert
            type="warning"
            showIcon
            message="Bài đã bị khóa hoặc không còn tồn tại. Bạn có thể sao chép nội dung bên dưới trước khi đóng; không cần gửi lại yêu cầu lưu."
          />
        )}
        <fieldset disabled={saving}>
          {fieldError('postType')}
          <div className="community-field">
            <label htmlFor="post-content">Nội dung (bắt buộc)</label>
            <textarea
              id="post-content"
              required
              value={draft.content}
              rows={5}
              maxLength={5000}
              aria-invalid={Boolean(errors.content)}
              aria-describedby="post-content-hint post-content-error"
              onChange={event => change({ content: event.target.value })}
            />
            <p id="post-content-hint" className="community-help">
              {draft.content.length.toLocaleString('vi-VN')}/5.000 ký tự
            </p>
            {fieldError('content')}
          </div>
          <PostImageInput
            label="Ảnh bìa (không bắt buộc)"
            value={draft.image}
            onChange={image => change({ image })}
            error={errors.image || errors.imageUrl}
          />
          <div className="community-field">
            <label htmlFor="post-pet">Thú cưng (không bắt buộc)</label>
            <select
              id="post-pet"
              value={draft.petId}
              disabled={petsLoading}
              aria-invalid={Boolean(errors.petId)}
              aria-describedby="post-petId-error"
              onChange={event => change({ petId: event.target.value })}
            >
              <option value="">
                {petsLoading ? 'Đang tải thú cưng…' : 'Chọn thú cưng của bạn'}
              </option>
              {draft.petId && !pets.some(pet => pet._id === draft.petId) && (
                <option value={draft.petId}>
                  {existingPet?.name || 'Thú cưng đã gắn'} (cần kiểm tra trạng
                  thái)
                </option>
              )}
              {pets.map(pet => (
                <option key={pet._id} value={pet._id}>
                  {pet.name} · {pet.code}
                </option>
              ))}
            </select>
            {fieldError('petId')}
            {petsError && (
              <Alert
                type="warning"
                message={petsError}
                action={
                  <Button onClick={() => setRetryPets(value => value + 1)}>
                    Tải lại thú cưng
                  </Button>
                }
              />
            )}
            {!petsLoading && !petsError && !pets.length && (
              <p className="community-help">
                Bạn chưa có thú cưng đang hoạt động. Có thể viết bài thảo luận
                mà không gắn thú cưng.
              </p>
            )}
          </div>
        </fieldset>
        <Space wrap className="community-editor-actions">
          <Button onClick={close} disabled={saving}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={locked}
          >
            {post ? 'Lưu thay đổi' : 'Gửi bài chờ duyệt'}
          </Button>
        </Space>
      </form>
    </Modal>
  );
}
