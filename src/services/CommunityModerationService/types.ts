import type {
  CommunityPostStatus,
  CommunityPostType,
  CommunityTimelineItem,
} from '../CommunityPostService/types.ts';
import type {
  CommunityCommentStatus,
  CommunityPagination,
} from '../CommunityService/types.ts';

export type ModerationPostStatusFilter = CommunityPostStatus | 'All';
export type ModerationDecision = 'Approve' | 'Reject';
export type ReportStatus = 'Pending' | 'Resolved';
export type ReportStatusFilter = ReportStatus | 'All';
export type ReportDecision = 'Keep' | 'Hide' | 'Delete';
export type ModerationTargetType = 'Post' | 'Comment';

/** Admin sees the author's code and phone, unlike the public feed */
export interface ModerationUser {
  _id: string;
  code?: string;
  fullName?: string;
  phone?: string;
}

export interface ModerationPet {
  _id: string;
  code?: string;
  name: string;
  species?: string;
  breed?: string;
  photoUrl?: string | null;
}

export interface ModerationPost {
  _id: string;
  authorId: ModerationUser | null;
  petId: ModerationPet | null;
  postType: CommunityPostType;
  content: string;
  imageUrl?: string | null;
  timelineItems: CommunityTimelineItem[];
  status: CommunityPostStatus;
  moderationNote?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  /** Medical or price words found in the content and milestone titles (list only) */
  hasSensitiveKeywords?: boolean;
  sensitiveMatches?: string[];
}

export interface ModerationPostsQuery {
  page?: number;
  limit?: number;
  status?: ModerationPostStatusFilter;
  postType?: CommunityPostType;
}

export interface ModerationPostsResult {
  posts: ModerationPost[];
  pagination: CommunityPagination;
}

export interface ModerationBody {
  decision: ModerationDecision;
  moderationNote?: string;
}

export interface ModeratePostResult {
  message: string;
  post: ModerationPost;
}

/** A reported comment, with the post it was written under */
export interface ReportedComment {
  _id: string;
  postId: {
    _id: string;
    postType: CommunityPostType;
    content: string;
    status: CommunityPostStatus;
    authorId?: string;
  } | null;
  authorId: ModerationUser | null;
  parentCommentId: string | null;
  content: string;
  status: CommunityCommentStatus;
  createdAt: string;
}

export interface ContentReport {
  _id: string;
  reporterId: ModerationUser | null;
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  resolvedById: ModerationUser | null;
  createdAt: string;
  updatedAt: string;
  /** null when the reported post or comment no longer exists */
  target: ModerationPost | ReportedComment | null;
  /** Every report filed on the same post or comment */
  reportCount: number;
}

export interface ReportsQuery {
  page?: number;
  limit?: number;
  status?: ReportStatusFilter;
  targetType?: ModerationTargetType;
}

export interface ReportsResult {
  reports: ContentReport[];
  pagination: CommunityPagination;
}

export interface ResolveBody {
  decision: ReportDecision;
  note?: string;
}

export interface ResolveReportResult {
  message: string;
  decision: ReportDecision;
  note: string | null;
  /** Pending reports on the same content closed with this one */
  resolvedCount: number;
}
