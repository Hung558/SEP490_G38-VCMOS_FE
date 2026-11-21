import api from '../01_axios';
import { buildCommentBody, buildReportBody } from './helpers';
import type {
  CommentsQuery,
  CommentsResult,
  CreateCommentResult,
  DeleteCommentResult,
  LikeState,
  PublicCommunityPost,
  PublicPostsQuery,
  PublicPostsResult,
  ReportResult,
  ReportTargetType,
  TimelineSharePayload,
  TimelineSharePreview,
  TimelineShareResult,
  ToggleLikeResult,
  WithdrawResult,
} from './types';
import {
  apiCommunityComment,
  apiCommunityPostComments,
  apiCommunityPostLike,
  apiCommunityPostLikeStatus,
  apiCommunityPostWithdraw,
  apiCommunityReports,
  apiPublicCommunityPost,
  apiPublicCommunityPosts,
  apiTimelineShare,
  apiTimelineSharePreview,
} from './urls';

type Options = { signal?: AbortSignal };

/** GET /community-posts/public: Published posts, newest first, no token needed */
const listPublicPosts = (
  query: PublicPostsQuery,
  options?: Options
): Promise<PublicPostsResult> =>
  api.get(apiPublicCommunityPosts, {
    params: query,
    signal: options?.signal,
  });

/** GET /community-posts/public/:id: 404 once the post is no longer Published */
const getPublicPost = (
  postId: string,
  options?: Options
): Promise<{ post: PublicCommunityPost }> =>
  api.get(apiPublicCommunityPost(postId), { signal: options?.signal });

/** GET /community-posts/:id/comments: roots newest first, each with its replies */
const listComments = (
  postId: string,
  query: CommentsQuery,
  options?: Options
): Promise<CommentsResult> =>
  api.get(apiCommunityPostComments(postId), {
    params: query,
    signal: options?.signal,
  });

/** POST /community-posts/:id/comments (PetOwner); a reply names its root comment */
const createComment = (
  postId: string,
  content: string,
  parentCommentId?: string | null
): Promise<CreateCommentResult> =>
  api.post(
    apiCommunityPostComments(postId),
    buildCommentBody(content, parentCommentId)
  );

/** DELETE /community-posts/comments/:commentId: the author's own comment only */
const deleteComment = (commentId: string): Promise<DeleteCommentResult> =>
  api.delete(apiCommunityComment(commentId));

/** POST /community-posts/:id/like toggles: a second call unlikes (BR-19: one like) */
const toggleLike = (postId: string): Promise<ToggleLikeResult> =>
  api.post(apiCommunityPostLike(postId));

/** GET /community-posts/:id/like-status (PetOwner) */
const getLikeStatus = (postId: string, options?: Options): Promise<LikeState> =>
  api.get(apiCommunityPostLikeStatus(postId), { signal: options?.signal });

/** POST /community-posts/reports: 400 on own content, 409 when already reported */
const reportContent = (
  targetType: ReportTargetType,
  targetId: string,
  reason: string
): Promise<ReportResult> =>
  api.post(apiCommunityReports, buildReportBody(targetType, targetId, reason));

/** PATCH /community-posts/:id/withdraw: the author takes a post off the community */
const withdrawPost = (postId: string): Promise<WithdrawResult> =>
  api.patch(apiCommunityPostWithdraw(postId));

/** GET /community-posts/timeline-share/preview?petId=: Done visits without SOAP, prescription or price */
const previewTimelineShare = (
  petId: string,
  options?: Options
): Promise<TimelineSharePreview> =>
  api.get(apiTimelineSharePreview, {
    params: { petId },
    signal: options?.signal,
  });

/** POST /community-posts/timeline-share: a TimelineShare post waiting for review */
const createTimelineShare = (
  payload: TimelineSharePayload
): Promise<TimelineShareResult> => api.post(apiTimelineShare, payload);

const CommunityService = {
  listPublicPosts,
  getPublicPost,
  listComments,
  createComment,
  deleteComment,
  toggleLike,
  getLikeStatus,
  reportContent,
  withdrawPost,
  previewTimelineShare,
  createTimelineShare,
};

export type * from './types';
export * from './helpers';
export * from './urls';
export default CommunityService;
