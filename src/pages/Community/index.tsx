import { useEffect } from 'react';
import { Alert, Button, Empty, Pagination, Skeleton, Tabs } from 'antd';
import { generatePath, useSearchParams } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import { useCommunityLikes } from '@/components/community/useCommunityLikes';
import { useCommunityViewer } from '@/components/community/useCommunityViewer';
import { usePublicPosts } from '@/components/community/usePublicPosts';
import {
  FEED_PAGE_SIZE,
  FEED_TABS,
  feedTabFromParam,
  feedTabToParam,
  pageFromParam,
} from '@/services/CommunityService';
import type { CommunityPostType } from '@/services/CommunityPostService';
import CommunityIntro from './components/CommunityIntro';
import { CommunityPageWrapper } from './components/styles';

const EMPTY_TEXT: Record<CommunityPostType, string> = {
  TimelineShare: 'Chưa có hành trình nào được chia sẻ.',
  Discussion: 'Chưa có bài trao đổi nào.',
};

/**
 * Nghiệp vụ 3.4: the community has two tabs, the shared timelines and the
 * discussions. Everyone reads Published posts (guests too); only pet owners
 * like, comment and report.
 */
const CommunityPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = feedTabFromParam(params.get('tab'));
  const page = pageFromParam(params.get('page'));
  const viewer = useCommunityViewer();
  const { result, loading, error, retry } = usePublicPosts(
    tab,
    page,
    FEED_PAGE_SIZE
  );
  const posts = result?.posts || [];
  const { likes, pending, toggle } = useCommunityLikes(
    posts.map(post => post._id),
    viewer.canInteract
  );

  const openPage = (nextTab: CommunityPostType, nextPage = 1) => {
    const next = new URLSearchParams({ tab: feedTabToParam(nextTab) });
    if (nextPage > 1) next.set('page', String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // A page number past the end (posts withdrawn or hidden meanwhile) falls back to the last page
  const totalPages = result?.pagination.totalPages ?? 0;
  useEffect(() => {
    if (result && page > Math.max(1, totalPages)) {
      const next = new URLSearchParams({ tab: feedTabToParam(tab) });
      if (totalPages > 1) next.set('page', String(totalPages));
      setParams(next, { replace: true });
    }
  }, [result, page, totalPages, tab, setParams]);

  return (
    <CommunityPageWrapper>
      <CommunityIntro />
      <Tabs
        className="community-tabs"
        activeKey={tab}
        onChange={key => openPage(key as CommunityPostType)}
        items={FEED_TABS.map(item => ({ key: item.key, label: item.label }))}
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{error}</span>}
          action={<Button onClick={retry}>Thử lại</Button>}
        />
      ) : loading ? (
        <div className="community-feed" role="status" aria-live="polite">
          {[0, 1, 2].map(key => (
            <Skeleton key={key} active avatar paragraph={{ rows: 3 }} />
          ))}
        </div>
      ) : posts.length ? (
        <>
          <div className="community-feed">
            {posts.map(post => (
              <CommunityPostCard
                key={post._id}
                post={post}
                to={generatePath(ROUTER.COMMUNITY_POST, { postId: post._id })}
                like={likes[post._id]}
                canLike={viewer.canInteract}
                liking={pending[post._id]}
                onToggleLike={() => void toggle(post._id)}
              />
            ))}
          </div>
          {(result?.pagination.total ?? 0) > FEED_PAGE_SIZE && (
            <Pagination
              className="community-pagination"
              current={page}
              pageSize={FEED_PAGE_SIZE}
              total={result?.pagination.total ?? 0}
              showSizeChanger={false}
              onChange={next => openPage(tab, next)}
            />
          )}
        </>
      ) : (
        <Empty description={EMPTY_TEXT[tab]} />
      )}
    </CommunityPageWrapper>
  );
};

export default CommunityPage;
