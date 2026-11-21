import { Image, Timeline, Typography } from 'antd';
import styled from 'styled-components';
import {
  safePostImageUrl,
  type CommunityPostType,
  type CommunityTimelineItem,
} from '@/services/CommunityPostService';
import { formatMilestoneDate } from '@/services/CommunityService';

const { Paragraph, Text } = Typography;

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  .post-text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 15px;
    line-height: 1.7;
    color: #1e293b;
  }

  .post-cover img {
    max-height: 440px;
    object-fit: cover;
    border-radius: 12px;
  }

  .milestone-title {
    display: block;
    margin-top: 2px;
    overflow-wrap: anywhere;
  }

  .milestone-image img {
    margin-top: 8px;
    width: 180px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
  }
`;

interface CommunityPostBodyProps {
  post: {
    postType: CommunityPostType;
    content?: string | null;
    imageUrl?: string | null;
    timelineItems?: CommunityTimelineItem[];
  };
  /** Text shown when the post has no message of its own */
  emptyText?: string;
}

/** Message, cover photo and shared milestones of one post */
const CommunityPostBody = ({ post, emptyText }: CommunityPostBodyProps) => {
  const cover = safePostImageUrl(post.imageUrl);
  const milestones = post.timelineItems || [];
  return (
    <BodyWrapper>
      {post.content ? (
        <Paragraph className="post-text">{post.content}</Paragraph>
      ) : (
        emptyText && <Text type="secondary">{emptyText}</Text>
      )}
      {cover && (
        <div className="post-cover">
          <Image src={cover} alt="Ảnh bài viết" width="100%" />
        </div>
      )}
      {post.postType === 'TimelineShare' && milestones.length > 0 && (
        <section aria-label="Các mốc hành trình">
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            Hành trình ({milestones.length} mốc)
          </Text>
          <Timeline
            items={milestones.map((item, index) => {
              const image = safePostImageUrl(item.imageUrl);
              return {
                key: item._id || `${item.date}-${index}`,
                color: '#0d9488',
                children: (
                  <div>
                    <Text type="secondary">
                      <time dateTime={item.date}>
                        {formatMilestoneDate(item.date)}
                      </time>
                    </Text>
                    <Text strong className="milestone-title">
                      {item.title}
                    </Text>
                    {image && (
                      <div className="milestone-image">
                        <Image src={image} alt={item.title} />
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        </section>
      )}
    </BodyWrapper>
  );
};

export default CommunityPostBody;
