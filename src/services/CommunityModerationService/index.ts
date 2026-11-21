import api from '../01_axios';
import {
  buildModerationBody,
  buildModerationPostsQuery,
  buildReportsQuery,
  buildResolveBody,
} from './helpers';
import type {
  ModeratePostResult,
  ModerationDecision,
  ModerationPostsQuery,
  ModerationPostsResult,
  ReportDecision,
  ReportsQuery,
  ReportsResult,
  ResolveReportResult,
} from './types';
import {
  apiModeratePost,
  apiModerationPosts,
  apiModerationReports,
  apiResolveReport,
} from './urls';

type Options = { signal?: AbortSignal };

/** GET /admin/community/posts: pending posts oldest first, others newest first */
const listPosts = (
  query: ModerationPostsQuery,
  options?: Options
): Promise<ModerationPostsResult> =>
  api.get(apiModerationPosts, {
    params: buildModerationPostsQuery(query),
    signal: options?.signal,
  });

/** PATCH /admin/community/posts/:id/moderate: Approve → Published, Reject → Hidden; 409 unless PendingReview */
const moderatePost = (
  postId: string,
  decision: ModerationDecision,
  note?: string
): Promise<ModeratePostResult> =>
  api.patch(apiModeratePost(postId), buildModerationBody(decision, note));

/** GET /admin/community/reports: each report with its target and report count */
const listReports = (
  query: ReportsQuery,
  options?: Options
): Promise<ReportsResult> =>
  api.get(apiModerationReports, {
    params: buildReportsQuery(query),
    signal: options?.signal,
  });

/** PATCH /admin/community/reports/:id/resolve: closes every pending report on the same content */
const resolveReport = (
  reportId: string,
  decision: ReportDecision,
  note?: string
): Promise<ResolveReportResult> =>
  api.patch(apiResolveReport(reportId), buildResolveBody(decision, note));

const CommunityModerationService = {
  listPosts,
  moderatePost,
  listReports,
  resolveReport,
};

export type * from './types';
export * from './helpers';
export * from './urls';
export default CommunityModerationService;
