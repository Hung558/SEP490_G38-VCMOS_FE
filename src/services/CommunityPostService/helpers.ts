import type {
  CommunityPost,
  CommunityPostDraft,
  CommunityPostErrors,
  CommunityPostStatus,
  CommunityPostType,
  DraftImage,
} from './types';

export const POST_TYPES: CommunityPostType[] = ['Discussion', 'TimelineShare'];
export const POST_STATUSES: CommunityPostStatus[] = [
  'PendingReview',
  'Published',
  'Hidden',
  'Removed',
];
export const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  Discussion: 'Thảo luận',
  TimelineShare: 'Chia sẻ hành trình',
};
export const POST_STATUS_LABELS: Record<CommunityPostStatus, string> = {
  PendingReview: 'Chờ duyệt',
  Published: 'Đã đăng',
  Hidden: 'Đã ẩn',
  Removed: 'Đã xóa',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TIMELINE_ITEMS = 50;
export const MAX_TIMELINE_IMAGES = 10;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const canManagePost = (post: Pick<CommunityPost, 'status'>) =>
  post.status === 'PendingReview';
export const postPetId = (post?: Pick<CommunityPost, 'petId'>) =>
  typeof post?.petId === 'string' ? post.petId : post?.petId?._id || '';

export const newTimelineItem = () => ({
  key: crypto.randomUUID(),
  date: '',
  title: '',
  image: {} as DraftImage,
});
export const createPostDraft = (post?: CommunityPost): CommunityPostDraft => ({
  postType: post?.postType || 'Discussion',
  content: post?.content || '',
  petId: postPetId(post),
  image: post?.imageUrl ? { existingUrl: post.imageUrl } : {},
  timelineItems: post?.timelineItems?.length
    ? post.timelineItems.map(item => ({
        ...item,
        key: crypto.randomUUID(),
        image: item.imageUrl ? { existingUrl: item.imageUrl } : {},
      }))
    : [newTimelineItem()],
});

export const validatePostImage = (
  file: Pick<File, 'type' | 'size'>
): string | undefined => {
  if (!IMAGE_ACCEPT.split(',').includes(file.type))
    return 'Chỉ chọn ảnh JPEG, PNG hoặc WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'Mỗi ảnh tối đa 5 MB.';
};

export const isCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export const validatePostDraft = (
  draft: CommunityPostDraft,
  existing?: CommunityPost
): CommunityPostErrors => {
  const errors: CommunityPostErrors = {};
  if (!POST_TYPES.includes(draft.postType))
    errors.postType = 'Hãy chọn loại bài viết.';
  if (existing && !canManagePost(existing))
    errors.status = 'Chỉ sửa được bài đang chờ duyệt.';
  if (draft.content.trim().length > 5000)
    errors.content = 'Nội dung tối đa 5.000 ký tự.';
  if (draft.postType === 'Discussion' && !draft.content.trim())
    errors.content = 'Hãy nhập nội dung thảo luận.';
  if (
    (draft.petId && !/^[a-f\d]{24}$/i.test(draft.petId)) ||
    (draft.postType === 'TimelineShare' && !draft.petId)
  ) {
    errors.petId = 'Hãy chọn một thú cưng của bạn đang hoạt động.';
  }
  const checkImage = (
    image: DraftImage,
    key: string,
    keepable: (string | null | undefined)[]
  ) => {
    if (image.file) {
      const error = validatePostImage(image.file);
      if (error) errors[key] = error;
    } else if (image.existingUrl && !keepable.includes(image.existingUrl)) {
      errors[key] =
        'Ảnh mới phải được tải lên; chỉ giữ được ảnh hiện có của bài.';
    }
  };
  checkImage(draft.image, 'image', existing ? [existing.imageUrl] : []);
  if (draft.postType === 'TimelineShare') {
    if (
      !draft.timelineItems.length ||
      draft.timelineItems.length > MAX_TIMELINE_ITEMS
    )
      errors.timelineItems = 'Hành trình cần từ 1 đến 50 mốc thời gian.';
    if (
      draft.timelineItems.filter(item => item.image.file).length >
      MAX_TIMELINE_IMAGES
    )
      errors.timelineItems =
        'Chỉ được tải tối đa 10 ảnh mốc thời gian trong mỗi lần lưu.';
    const keepableImages =
      existing?.timelineItems.map(row => row.imageUrl) || [];
    draft.timelineItems.forEach((item, index) => {
      const key = `timelineItems.${index}`;
      if (!isCalendarDate(item.date))
        errors[`${key}.date`] =
          'Hãy chọn ngày có thật theo định dạng YYYY-MM-DD.';
      if (!item.title.trim() || item.title.trim().length > 200)
        errors[`${key}.title`] = 'Tiêu đề cần từ 1 đến 200 ký tự.';
      checkImage(item.image, `${key}.image`, keepableImages);
    });
  }
  return errors;
};

/** PUT is a full replacement: omission deliberately removes an existing image. */
export const buildPostFormData = (
  draft: CommunityPostDraft,
  existing?: CommunityPost
): FormData => {
  const errors = validatePostDraft(draft, existing);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const form = new FormData();
  form.append('postType', draft.postType);
  form.append('content', draft.content.trim());
  if (draft.petId) form.append('petId', draft.petId);
  if (draft.image.file) form.append('image', draft.image.file);
  else if (existing && draft.image.existingUrl)
    form.append('imageUrl', draft.image.existingUrl);
  if (draft.postType === 'TimelineShare') {
    let imageIndex = 0;
    const timelineItems = draft.timelineItems.map(item => {
      const clean: {
        date: string;
        title: string;
        imageIndex?: number;
        imageUrl?: string;
      } = { date: item.date, title: item.title.trim() };
      if (item.image.file) {
        clean.imageIndex = imageIndex++;
        form.append('timelineImages', item.image.file);
      } else if (existing && item.image.existingUrl)
        clean.imageUrl = item.image.existingUrl;
      return clean;
    });
    form.append('timelineItems', JSON.stringify(timelineItems));
  }
  return form;
};

export const readCommunityPostError = (failure: unknown, fallback: string) => {
  const error = failure as {
    response?: {
      status?: number;
      data?: { message?: unknown; errors?: unknown };
    };
  };
  const status = error?.response?.status;
  const body = error?.response?.data;
  const fields: CommunityPostErrors = {};
  const flatten = (value: unknown, path: string) => {
    if (typeof value === 'string') fields[path] = value;
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, nested]) =>
        flatten(nested, path ? `${path}.${key}` : key)
      );
  };
  flatten(body?.errors, '');
  return {
    status,
    fields,
    message:
      status === 409
        ? 'Bài viết không còn chờ duyệt nên không thể sửa hoặc xóa. Nội dung bạn đang soạn vẫn được giữ lại.'
        : typeof body?.message === 'string'
          ? body.message
          : fallback,
  };
};

/** Stored API images are remote URLs; local file previews are handled separately. */
export const safePostImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};
