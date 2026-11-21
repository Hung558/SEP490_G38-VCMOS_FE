import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import CommunityService, {
  readCommunityError,
  type LikeState,
} from '@/services/CommunityService';

/**
 * Like state of the posts on screen. The public feed does not say whether the
 * viewer liked a post, so a pet owner asks like-status once per post; guests
 * and staff only see the like count of the list (BE: PetOwner only).
 */
export const useCommunityLikes = (postIds: string[], enabled: boolean) => {
  const idsKey = postIds.join(',');
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const inFlight = useRef(new Set<string>());
  // When each post was last toggled: a like-status answer asked for before
  // that moment is older than the toggle and must not overwrite it
  const toggledAt = useRef(new Map<string, number>());

  useEffect(() => {
    if (!enabled || !ids.length) {
      setLikes({});
      return;
    }
    const controller = new AbortController();
    const askedAt = Date.now();
    void Promise.allSettled(
      ids.map(id =>
        CommunityService.getLikeStatus(id, { signal: controller.signal }).then(
          state => [id, state] as const
        )
      )
    ).then(results => {
      if (controller.signal.aborted) return;
      setLikes(previous => {
        const next: Record<string, LikeState> = {};
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            const [id, state] = result.value;
            next[id] = { liked: state.liked, likeCount: state.likeCount };
          }
        });
        ids.forEach(id => {
          if ((toggledAt.current.get(id) ?? 0) >= askedAt && previous[id])
            next[id] = previous[id];
        });
        return next;
      });
    });
    return () => controller.abort();
  }, [ids, enabled]);

  /** Toggles the viewer's like; resolves with the new state, or undefined on failure */
  const toggle = useCallback(
    async (postId: string): Promise<LikeState | undefined> => {
      if (!enabled || inFlight.current.has(postId)) return undefined;
      inFlight.current.add(postId);
      setPending(previous => ({ ...previous, [postId]: true }));
      try {
        const result = await CommunityService.toggleLike(postId);
        const state = { liked: result.liked, likeCount: result.likeCount };
        toggledAt.current.set(postId, Date.now());
        setLikes(previous => ({ ...previous, [postId]: state }));
        return state;
      } catch (failure) {
        toast.error(
          readCommunityError(
            failure,
            'Chưa cập nhật được lượt thích. Vui lòng thử lại.'
          ).message
        );
        return undefined;
      } finally {
        inFlight.current.delete(postId);
        setPending(previous => ({ ...previous, [postId]: false }));
      }
    },
    [enabled]
  );

  return { likes, pending, toggle };
};
