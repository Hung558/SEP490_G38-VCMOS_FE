export type CommunityPostType = 'Discussion' | 'TimelineShare';
export type CommunityPostStatus =
  | 'PendingReview'
  | 'Published'
  | 'Hidden'
  | 'Removed';

export interface CommunityPostPet {
  _id: string;
  name: string;
  code?: string;
  species?: string;
  photoUrl?: string | null;
}

export interface CommunityTimelineItem {
  _id?: string;
  date: string;
  title: string;
  imageUrl?: string | null;
}

export interface CommunityPost {
  _id: string;
  authorId: string;
  petId?: CommunityPostPet | string | null;
  postType: CommunityPostType;
  content: string;
  imageUrl?: string | null;
  timelineItems: CommunityTimelineItem[];
  status: CommunityPostStatus;
  moderationNote?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostsQuery {
  page?: number;
  limit?: number;
  status?: CommunityPostStatus;
  postType?: CommunityPostType;
}

export interface CommunityPostsResult {
  posts: CommunityPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DraftImage {
  file?: File;
  existingUrl?: string;
}

export interface TimelineItemDraft {
  key: string;
  date: string;
  title: string;
  image: DraftImage;
}

export interface CommunityPostDraft {
  postType: CommunityPostType;
  content: string;
  petId: string;
  image: DraftImage;
  timelineItems: TimelineItemDraft[];
}

export type CommunityPostErrors = Record<string, string>;
