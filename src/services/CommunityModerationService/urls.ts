// Admin community moderation (SCR-33, BE PR #57); every route is Admin only
const segment = (value: string) => encodeURIComponent(value);

export const apiModerationPosts = '/admin/community/posts';
export const apiModeratePost = (postId: string) =>
  `/admin/community/posts/${segment(postId)}/moderate`;
export const apiModerationReports = '/admin/community/reports';
export const apiResolveReport = (reportId: string) =>
  `/admin/community/reports/${segment(reportId)}/resolve`;
