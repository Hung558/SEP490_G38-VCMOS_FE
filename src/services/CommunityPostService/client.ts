import type {
  CommunityPost,
  CommunityPostDraft,
  CommunityPostsQuery,
  CommunityPostsResult,
} from './types';
import { buildPostFormData } from './helpers.ts';

export interface CommunityPostTransport {
  get<T>(
    url: string,
    config?: { params?: CommunityPostsQuery; signal?: AbortSignal }
  ): Promise<T>;
  post<T>(url: string, data: FormData): Promise<T>;
  put<T>(url: string, data: FormData): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

/** Only the five authenticated owner endpoints supported by BE PR53. */
export const createCommunityPostService = (api: CommunityPostTransport) => {
  const root = '/community-posts';
  const detail = (id: string) => `${root}/${encodeURIComponent(id)}`;
  return {
    listMine: (query: CommunityPostsQuery = {}, signal?: AbortSignal) =>
      api.get<CommunityPostsResult>(root, { params: query, signal }),
    getMine: (id: string, signal?: AbortSignal) =>
      api.get<{ post: CommunityPost }>(detail(id), { signal }),
    create: (draft: CommunityPostDraft) =>
      api.post<{ post: CommunityPost; message: string }>(
        root,
        buildPostFormData(draft)
      ),
    update: (existing: CommunityPost, draft: CommunityPostDraft) =>
      api.put<{ post: CommunityPost; message: string }>(
        detail(existing._id),
        buildPostFormData(draft, existing)
      ),
    remove: (id: string) => api.delete<{ message: string }>(detail(id)),
  };
};
