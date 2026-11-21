// Community feed and interactions (BE PR #55, #57). The static paths
// (/public, /timeline-share, /reports, /comments/:id) are matched by the BE
// before '/:id', so ids are always encoded and never used as a path prefix.
const segment = (value: string) => encodeURIComponent(value);

/** GET: Published posts, no token needed (Guest, every role) */
export const apiPublicCommunityPosts = '/community-posts/public';
export const apiPublicCommunityPost = (postId: string) =>
  `/community-posts/public/${segment(postId)}`;

/** GET is public; POST is PetOwner only */
export const apiCommunityPostComments = (postId: string) =>
  `/community-posts/${segment(postId)}/comments`;
/** DELETE: the author soft-deletes their own comment */
export const apiCommunityComment = (commentId: string) =>
  `/community-posts/comments/${segment(commentId)}`;

/** PetOwner only */
export const apiCommunityPostLike = (postId: string) =>
  `/community-posts/${segment(postId)}/like`;
export const apiCommunityPostLikeStatus = (postId: string) =>
  `/community-posts/${segment(postId)}/like-status`;
export const apiCommunityPostWithdraw = (postId: string) =>
  `/community-posts/${segment(postId)}/withdraw`;
export const apiCommunityReports = '/community-posts/reports';
export const apiTimelineSharePreview =
  '/community-posts/timeline-share/preview';
export const apiTimelineShare = '/community-posts/timeline-share';
