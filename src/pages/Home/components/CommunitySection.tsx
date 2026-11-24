import React, { useState } from 'react';
import { Alert, Button, Empty, Segmented, Skeleton } from 'antd';
import { ArrowRightOutlined, EditOutlined } from '@ant-design/icons';
import { generatePath, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import ROUTER from '@/routerMap/ROUTER';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import { useCommunityLikes } from '@/components/community/useCommunityLikes';
import { useCommunityViewer } from '@/components/community/useCommunityViewer';
import { usePublicPosts } from '@/components/community/usePublicPosts';
import {
  FEED_TABS,
  feedTabToParam,
  HOME_FEED_SIZE,
} from '@/services/CommunityService';
import type { CommunityPostType } from '@/services/CommunityPostService';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px 56px 24px;
  scroll-margin-top: 76px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 28px auto;

  .section-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #0d9488;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    padding: 5px 14px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 36px;
    font-weight: 850;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 0;

    @media (max-width: 640px) {
      font-size: 28px;
    }
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;

  .ant-segmented {
    max-width: 100%;
    overflow-x: auto;
  }

  .toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
  margin-top: 28px;
  color: #64748b;
  text-align: center;
`;

// The home page lists "Trao đổi" first and opens on it, for every role (24/11).
// The community page keeps FEED_TABS' own order.
const HOME_FEED_TABS = [
  ...FEED_TABS.filter(item => item.key === 'Discussion'),
  ...FEED_TABS.filter(item => item.key !== 'Discussion'),
];

/**
 * Latest Published community posts on the home page, for every role. Guests
 * and clinic staff only read; pet owners can also like from here.
 */
const CommunitySection: React.FC = () => {
  const navigate = useNavigate();
  const viewer = useCommunityViewer();
  const [tab, setTab] = useState<CommunityPostType>(HOME_FEED_TABS[0].key);
  const { result, loading, error, retry } = usePublicPosts(
    tab,
    1,
    HOME_FEED_SIZE
  );
  const posts = result?.posts || [];
  const { likes, pending, toggle } = useCommunityLikes(
    posts.map(post => post._id),
    viewer.canInteract
  );
  const feedPath = `${ROUTER.COMMUNITY}?tab=${feedTabToParam(tab)}`;

  return (
    <SectionWrapper id="community" aria-labelledby="home-community-title">
      <SectionHeader>
        <span className="section-tag">Cộng đồng</span>
        <h2 id="home-community-title">Cộng đồng chủ nuôi VCMOS</h2>
      </SectionHeader>

      <Toolbar>
        <Segmented<CommunityPostType>
          aria-label="Chọn loại bài cộng đồng"
          value={tab}
          onChange={setTab}
          options={HOME_FEED_TABS.map(item => ({
            value: item.key,
            label: item.label,
          }))}
        />
        {/* 24/11: "Viết bài trao đổi" sits up here, beside "Xem tất cả" */}
        <div className="toolbar-actions">
          {viewer.canInteract && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`${ROUTER.MY_COMMUNITY_POSTS}?compose=1`)}
            >
              Viết bài trao đổi
            </Button>
          )}
          <Button onClick={() => navigate(feedPath)}>
            Xem tất cả <ArrowRightOutlined />
          </Button>
        </div>
      </Toolbar>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{error}</span>}
          action={<Button onClick={retry}>Thử lại</Button>}
        />
      ) : loading ? (
        <PostGrid role="status" aria-live="polite">
          {[0, 1, 2].map(key => (
            <Skeleton key={key} active avatar paragraph={{ rows: 4 }} />
          ))}
        </PostGrid>
      ) : posts.length ? (
        <PostGrid>
          {posts.map(post => (
            <CommunityPostCard
              key={post._id}
              compact
              post={post}
              to={generatePath(ROUTER.COMMUNITY_POST, { postId: post._id })}
              like={likes[post._id]}
              canLike={viewer.canInteract}
              liking={pending[post._id]}
              onToggleLike={() => void toggle(post._id)}
            />
          ))}
        </PostGrid>
      ) : (
        <Empty
          description={
            tab === 'TimelineShare'
              ? 'Chưa có hành trình nào được chia sẻ.'
              : 'Chưa có bài trao đổi nào.'
          }
        />
      )}

      {!viewer.signedIn && (
        <Footer>
          <span>
            Đăng nhập bằng tài khoản chủ nuôi để thích, bình luận và chia sẻ
            hành trình của bé.
          </span>
        </Footer>
      )}
    </SectionWrapper>
  );
};

export default CommunitySection;
