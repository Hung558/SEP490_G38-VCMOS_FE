import { useCallback, useEffect, useState } from 'react';
import CommunityService, {
  readCommunityError,
  type PublicPostsResult,
} from '@/services/CommunityService';
import type { CommunityPostType } from '@/services/CommunityPostService';

/** One page of Published posts of one tab (GET /community-posts/public) */
export const usePublicPosts = (
  postType: CommunityPostType,
  page: number,
  limit: number
) => {
  const [result, setResult] = useState<PublicPostsResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    CommunityService.listPublicPosts(
      { postType, page, limit },
      { signal: controller.signal }
    )
      .then(data => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setResult(undefined);
        setError(
          readCommunityError(
            failure,
            'Không tải được bài viết cộng đồng. Vui lòng thử lại.'
          ).message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [postType, page, limit, attempt]);

  const retry = useCallback(() => setAttempt(value => value + 1), []);

  return { result, loading, error, retry };
};
