// Pure helpers (no @/ imports) so node:test can load this file directly
import type { CommunityCommentStatus } from '../CommunityService/types.ts';
import type {
  ContentReport,
  ModerationBody,
  ModerationDecision,
  ModerationPostStatusFilter,
  ModerationPostsQuery,
  ReportDecision,
  ReportedComment,
  ReportsQuery,
  ReportStatus,
  ReportStatusFilter,
  ResolveBody,
} from './types.ts';

// BE communityModeration.validator: notes up to 500 characters, 10 rows per page
export const MODERATION_NOTE_MAX_LENGTH = 500;
export const MODERATION_PAGE_SIZE = 10;

export const MODERATION_POST_FILTERS: {
  value: ModerationPostStatusFilter;
  label: string;
}[] = [
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'Published', label: 'Đã đăng' },
  { value: 'Hidden', label: 'Đã ẩn' },
  { value: 'Removed', label: 'Đã xóa' },
  { value: 'All', label: 'Tất cả' },
];

export const REPORT_STATUS_FILTERS: {
  value: ReportStatusFilter;
  label: string;
}[] = [
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'Resolved', label: 'Đã xử lý' },
  { value: 'All', label: 'Tất cả' },
];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  Pending: 'Chờ xử lý',
  Resolved: 'Đã xử lý',
};

/** Nghiệp vụ 7.1: a report is handled by keeping, hiding or deleting the content */
export const REPORT_DECISIONS: {
  value: ReportDecision;
  label: string;
  hint: string;
}[] = [
  {
    value: 'Keep',
    label: 'Giữ lại',
    hint: 'Nội dung không vi phạm, vẫn hiện trên cộng đồng.',
  },
  {
    value: 'Hide',
    label: 'Ẩn',
    hint: 'Nội dung bị ẩn khỏi cộng đồng.',
  },
  {
    value: 'Delete',
    label: 'Xóa',
    hint: 'Nội dung bị gỡ khỏi cộng đồng.',
  },
];

export const COMMENT_STATUS_LABELS: Record<CommunityCommentStatus, string> = {
  Published: 'Đang hiện',
  Hidden: 'Đã ẩn',
  Deleted: 'Đã xóa',
};

/** Rejecting a post needs a reason (MSG22); approving does not */
export const validateModerationNote = (
  decision: ModerationDecision,
  note: string
): string | undefined => {
  const text = note.trim();
  if (text.length > MODERATION_NOTE_MAX_LENGTH)
    return `Ghi chú tối đa ${MODERATION_NOTE_MAX_LENGTH} ký tự.`;
  if (decision === 'Reject' && !text) return 'Hãy nhập lý do từ chối bài viết.';
  return undefined;
};

export const buildModerationBody = (
  decision: ModerationDecision,
  note = ''
): ModerationBody => {
  const error = validateModerationNote(decision, note);
  if (error) throw new RangeError(error);
  return note.trim() ? { decision, moderationNote: note.trim() } : { decision };
};

/** Hiding or deleting reported content needs a note (MSG22); keeping it does not */
export const isResolveNoteRequired = (decision: ReportDecision): boolean =>
  decision === 'Hide' || decision === 'Delete';

export const validateResolveNote = (
  decision: ReportDecision,
  note: string
): string | undefined => {
  const text = note.trim();
  if (text.length > MODERATION_NOTE_MAX_LENGTH)
    return `Ghi chú tối đa ${MODERATION_NOTE_MAX_LENGTH} ký tự.`;
  if (isResolveNoteRequired(decision) && !text)
    return 'Hãy nhập lý do khi ẩn hoặc xóa nội dung.';
  return undefined;
};

export const buildResolveBody = (
  decision: ReportDecision,
  note = ''
): ResolveBody => {
  const error = validateResolveNote(decision, note);
  if (error) throw new RangeError(error);
  return note.trim() ? { decision, note: note.trim() } : { decision };
};

/** Drops empty filters so the BE applies its defaults */
export const buildModerationPostsQuery = (
  query: ModerationPostsQuery
): ModerationPostsQuery => ({
  page: query.page || 1,
  limit: query.limit || MODERATION_PAGE_SIZE,
  ...(query.status ? { status: query.status } : {}),
  ...(query.postType ? { postType: query.postType } : {}),
});

export const buildReportsQuery = (query: ReportsQuery): ReportsQuery => ({
  page: query.page || 1,
  limit: query.limit || MODERATION_PAGE_SIZE,
  ...(query.status ? { status: query.status } : {}),
  ...(query.targetType ? { targetType: query.targetType } : {}),
});

export const isReportedComment = (
  report: Pick<ContentReport, 'targetType' | 'target'>
): report is Pick<ContentReport, 'targetType'> & {
  target: ReportedComment;
} => report.targetType === 'Comment' && Boolean(report.target);
