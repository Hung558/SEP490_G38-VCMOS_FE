// Pure helpers (no @/ imports) so node:test can load this file directly
import type { CommunityPostType } from '../CommunityPostService/types.ts';
import type {
  CommentBody,
  CommunityApiError,
  CommunityAuthor,
  CommunityComment,
  ReportBody,
  ReportTargetType,
  ShareMilestone,
  TimelineSharePayload,
} from './types.ts';

// Limits from the BE validators (communityInteraction / communityPost)
export const COMMENT_MAX_LENGTH = 500;
export const REPORT_REASON_MAX_LENGTH = 200;
export const SHARE_CONTENT_MAX_LENGTH = 5000;
export const SHARE_MAX_MILESTONES = 50;
export const FEED_PAGE_SIZE = 10;
export const HOME_FEED_SIZE = 6;
export const COMMENT_PAGE_SIZE = 20;

/** Nghiệp vụ 3.4: tab 1 gathers the shared timelines, tab 2 the discussions */
export const FEED_TABS: { key: CommunityPostType; label: string }[] = [
  { key: 'TimelineShare', label: 'Hành trình được chia sẻ' },
  { key: 'Discussion', label: 'Trao đổi' },
];

const TAB_PARAMS: Record<CommunityPostType, string> = {
  TimelineShare: 'timeline',
  Discussion: 'discussion',
};

/** ?tab= value of the community page; anything unknown opens the first tab */
export const feedTabToParam = (tab: CommunityPostType): string =>
  TAB_PARAMS[tab];

export const feedTabFromParam = (value?: string | null): CommunityPostType =>
  value === TAB_PARAMS.Discussion ? 'Discussion' : 'TimelineShare';

/** ?page= of the community page: a positive integer, else 1 */
export const pageFromParam = (value?: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/**
 * The BE lets only PetOwner like, comment, report, withdraw and share
 * (authorize('PetOwner')); guests and clinic staff read the public feed only.
 */
export const canInteractInCommunity = (role?: string | null): boolean =>
  (role || '').trim().toLowerCase() === 'petowner';

const authorIdOf = (author?: CommunityAuthor | string | null) =>
  typeof author === 'string' ? author : author?._id;

/** Whether the signed-in user wrote this post or comment */
export const isOwnContent = (
  author: CommunityAuthor | string | null | undefined,
  userId?: string | null
): boolean => Boolean(userId) && authorIdOf(author) === userId;

export const authorName = (author?: CommunityAuthor | string | null) =>
  (typeof author === 'object' && author?.fullName?.trim()) ||
  'Thành viên VCMOS';

/** Only a Published post can be withdrawn by its author; a pending one is deleted instead */
export const canWithdrawPost = (status?: string | null): boolean =>
  status === 'Published';

export const validateCommentContent = (value: string): string | undefined => {
  const text = value.trim();
  if (!text) return 'Hãy nhập nội dung bình luận.';
  if (text.length > COMMENT_MAX_LENGTH)
    return `Bình luận tối đa ${COMMENT_MAX_LENGTH} ký tự.`;
  return undefined;
};

/** POST /:id/comments body; a reply names its root comment (BR-19: one level) */
export const buildCommentBody = (
  content: string,
  parentCommentId?: string | null
): CommentBody => {
  const error = validateCommentContent(content);
  if (error) throw new RangeError(error);
  return parentCommentId
    ? { content: content.trim(), parentCommentId }
    : { content: content.trim() };
};

export const validateReportReason = (value: string): string | undefined => {
  const text = value.trim();
  if (!text) return 'Hãy nhập lý do báo cáo.';
  if (text.length > REPORT_REASON_MAX_LENGTH)
    return `Lý do tối đa ${REPORT_REASON_MAX_LENGTH} ký tự.`;
  return undefined;
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  Post: 'bài viết',
  Comment: 'bình luận',
};

export const buildReportBody = (
  targetType: ReportTargetType,
  targetId: string,
  reason: string
): ReportBody => {
  if (!(targetType in REPORT_TARGET_LABELS))
    throw new RangeError('Không rõ nội dung cần báo cáo.');
  const error = validateReportReason(reason);
  if (error) throw new RangeError(error);
  return { targetType, targetId, reason: reason.trim() };
};

export const validateShareSelection = (
  selectedOrderIds: string[],
  content: string
): string | undefined => {
  if (!selectedOrderIds.length) return 'Hãy chọn ít nhất 1 mốc để chia sẻ.';
  if (selectedOrderIds.length > SHARE_MAX_MILESTONES)
    return `Mỗi bài chia sẻ tối đa ${SHARE_MAX_MILESTONES} mốc.`;
  if (content.trim().length > SHARE_CONTENT_MAX_LENGTH)
    return 'Lời nhắn tối đa 5.000 ký tự.';
  return undefined;
};

/**
 * POST /timeline-share body: only visits the owner saw in the preview, in the
 * preview's order. The BE rebuilds every milestone itself from those orders.
 */
export const buildTimelineSharePayload = (
  petId: string,
  selectedOrderIds: string[],
  milestones: ShareMilestone[],
  content: string
): TimelineSharePayload => {
  const chosen = new Set(selectedOrderIds);
  const orderIds = milestones
    .map(item => item.orderId)
    .filter((orderId, index, all) => {
      return chosen.has(orderId) && all.indexOf(orderId) === index;
    });
  const error = validateShareSelection(orderIds, content);
  if (error) throw new RangeError(error);
  return content.trim()
    ? { petId, orderIds, content: content.trim() }
    : { petId, orderIds };
};

/** "2026-11-20" → "20/11/2026"; any other text is shown as is */
export const formatMilestoneDate = (value?: string | null): string =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split('-').reverse().join('/')
    : value || '';

/** A new root goes on top (the BE lists newest roots first); a reply goes last under its root */
export const addCommentToThread = (
  comments: CommunityComment[],
  created: CommunityComment
): CommunityComment[] => {
  if (!created.parentCommentId)
    return [
      { ...created, replies: created.replies || [] },
      ...comments.filter(comment => comment._id !== created._id),
    ];
  return comments.map(comment =>
    comment._id === created.parentCommentId
      ? {
          ...comment,
          replies: [
            ...(comment.replies || []).filter(
              reply => reply._id !== created._id
            ),
            created,
          ],
        }
      : comment
  );
};

/** Deleting a root hides its replies too: the BE only lists replies of Published roots */
export const removeCommentFromThread = (
  comments: CommunityComment[],
  commentId: string
): CommunityComment[] =>
  comments
    .filter(comment => comment._id !== commentId)
    .map(comment =>
      comment.replies?.some(reply => reply._id === commentId)
        ? {
            ...comment,
            replies: comment.replies.filter(reply => reply._id !== commentId),
          }
        : comment
    );

/** "Xem thêm": new comments shift the pages, so skip roots already shown */
export const appendCommentPage = (
  current: CommunityComment[],
  next: CommunityComment[]
): CommunityComment[] => {
  const shown = new Set(current.map(comment => comment._id));
  return [...current, ...next.filter(comment => !shown.has(comment._id))];
};

const flattenErrors = (
  value: unknown,
  path: string,
  fields: Record<string, string>
) => {
  if (typeof value === 'string') fields[path || 'message'] = value;
  else if (value && typeof value === 'object')
    Object.entries(value).forEach(([key, nested]) =>
      flattenErrors(nested, path ? `${path}.${key}` : key, fields)
    );
};

/** Status, the BE's Vietnamese message (or the fallback) and field errors */
export const readCommunityError = (
  failure: unknown,
  fallback: string
): CommunityApiError => {
  const error = failure as {
    response?: {
      status?: number;
      data?: { message?: unknown; errors?: unknown };
    };
  };
  const status = error?.response?.status;
  const body = error?.response?.data;
  const fields: Record<string, string> = {};
  flattenErrors(body?.errors, '', fields);
  const firstField = Object.values(fields)[0];
  const message =
    status === 400 && firstField
      ? firstField
      : typeof body?.message === 'string' && body.message.trim()
        ? body.message
        : fallback;
  return { status, message, fields };
};
