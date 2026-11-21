import type {
  CommunityPost,
  CommunityPostStatus,
  CommunityPostType,
  CommunityTimelineItem,
} from '../CommunityPostService/types.ts';

export interface CommunityPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The BE only exposes the display name of an author (no phone, no email) */
export interface CommunityAuthor {
  _id: string;
  fullName?: string;
}

/** null when the pet was soft-deleted after the post went public */
export interface PublicCommunityPet {
  _id: string;
  name: string;
  species?: string;
  breed?: string;
  photoUrl?: string | null;
}

/** A Published post as GET /community-posts/public returns it (no moderationNote) */
export interface PublicCommunityPost {
  _id: string;
  authorId: CommunityAuthor | null;
  petId: PublicCommunityPet | null;
  postType: CommunityPostType;
  content: string;
  imageUrl?: string | null;
  timelineItems: CommunityTimelineItem[];
  status: CommunityPostStatus;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPostsQuery {
  page?: number;
  limit?: number;
  postType?: CommunityPostType;
}

export interface PublicPostsResult {
  posts: PublicCommunityPost[];
  pagination: CommunityPagination;
}

export type CommunityCommentStatus = 'Published' | 'Deleted' | 'Hidden';

export interface CommunityComment {
  _id: string;
  postId: string;
  authorId: CommunityAuthor | null;
  /** null for a root comment; replies are one level deep only (BR-19) */
  parentCommentId: string | null;
  content: string;
  status: CommunityCommentStatus;
  createdAt: string;
  updatedAt?: string;
  /** Root comments only, oldest first */
  replies?: CommunityComment[];
}

export interface CommentsQuery {
  page?: number;
  limit?: number;
}

export interface CommentsResult {
  comments: CommunityComment[];
  pagination: CommunityPagination;
}

export interface CommentBody {
  content: string;
  parentCommentId?: string;
}

export interface CreateCommentResult {
  message: string;
  comment: CommunityComment;
  commentCount: number;
}

export interface DeleteCommentResult {
  message: string;
  commentCount: number;
}

export interface LikeState {
  liked: boolean;
  likeCount: number;
}

export interface ToggleLikeResult extends LikeState {
  message: string;
}

export type ReportTargetType = 'Post' | 'Comment';

export interface ReportBody {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export interface ReportResult {
  message: string;
}

export interface WithdrawResult {
  message: string;
  post: { _id: string; status: CommunityPostStatus };
}

/** One Done visit as the BE prepares it for sharing: no SOAP, prescription or price (BR-18) */
export interface ShareMilestone {
  orderId: string;
  orderCode?: string;
  date: string;
  title: string;
  services: string[];
  imageUrl?: string;
}

export interface TimelineSharePreview {
  pet: {
    _id: string;
    code?: string;
    name: string;
    species?: string | null;
    photoUrl?: string | null;
  };
  /** Oldest first, at most the 50 latest Done visits */
  milestones: ShareMilestone[];
  totalEligible: number;
  truncated: boolean;
}

export interface TimelineSharePayload {
  petId: string;
  orderIds: string[];
  content?: string;
}

export interface TimelineShareResult {
  message: string;
  post: CommunityPost;
}

export interface CommunityApiError {
  status?: number;
  message: string;
  fields: Record<string, string>;
}
