import { Avatar, Tag } from 'antd';
import { CommentOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { safePostImageUrl } from '@/services/CommunityPostService';
import {
  authorName,
  formatMilestoneDate,
  type LikeState,
  type PublicCommunityPost,
} from '@/services/CommunityService';
import LikeButton from './LikeButton';

const MILESTONE_PREVIEW = 3;

const CardWrapper = styled.article<{ $lines: number }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-width: 0;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;

  &:hover {
    border-color: #99f6e4;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  }

  .post-head {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .post-author {
    display: block;
    color: #0f172a;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .post-meta {
    display: block;
    color: #64748b;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .post-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #334155;
    text-decoration: none;

    &:hover .post-content {
      color: #0f172a;
    }
  }

  .post-content {
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: ${props => props.$lines};
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }

  .post-image {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 10px;
    background: #f1f5f9;
  }

  .milestones {
    margin: 0;
    padding: 0 0 0 14px;
    list-style: none;
    border-left: 2px solid #ccfbf1;

    li {
      margin: 0 0 6px;
      overflow-wrap: anywhere;
    }

    time {
      color: #0d9488;
      font-weight: 600;
      margin-right: 6px;
    }
  }

  .post-foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;

    a {
      color: #475569;
      font-size: 14px;
    }

    .post-open {
      margin-left: auto;
      color: #0d9488;
      font-weight: 600;
    }
  }
`;

interface CommunityPostCardProps {
  post: PublicCommunityPost;
  /** Link of the post page */
  to: string;
  like?: LikeState;
  canLike: boolean;
  liking?: boolean;
  onToggleLike?: () => void;
  /** Smaller text block for the home page grid */
  compact?: boolean;
}

/** A Published post in the community feed and on the home page */
const CommunityPostCard = ({
  post,
  to,
  like,
  canLike,
  liking,
  onToggleLike,
  compact,
}: CommunityPostCardProps) => {
  const pet = post.petId;
  const petPhoto = safePostImageUrl(pet?.photoUrl);
  const milestones = post.timelineItems || [];
  const cover =
    safePostImageUrl(post.imageUrl) ||
    milestones.map(item => safePostImageUrl(item.imageUrl)).find(Boolean);
  const name = authorName(post.authorId);
  const meta = [
    pet ? [pet.name, pet.species].filter(Boolean).join(' · ') : '',
    dayjs(post.createdAt).format('DD/MM/YYYY HH:mm'),
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <CardWrapper $lines={compact ? 3 : 5}>
      <div className="post-head">
        <Avatar
          size={44}
          src={petPhoto}
          style={{ backgroundColor: '#0d9488', flexShrink: 0 }}
        >
          {(pet?.name || name).charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <span className="post-author">{name}</span>
          <span className="post-meta">{meta}</span>
        </div>
      </div>

      <Link to={to} className="post-body">
        {post.content ? <p className="post-content">{post.content}</p> : null}
        {cover && <img className="post-image" src={cover} alt="" />}
        {post.postType === 'TimelineShare' && milestones.length > 0 && (
          <ul className="milestones" aria-label="Các mốc hành trình">
            {milestones.slice(0, MILESTONE_PREVIEW).map((item, index) => (
              <li key={item._id || `${item.date}-${index}`}>
                <time dateTime={item.date}>
                  {formatMilestoneDate(item.date)}
                </time>
                {item.title}
              </li>
            ))}
            {milestones.length > MILESTONE_PREVIEW && (
              <li>
                <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                  +{milestones.length - MILESTONE_PREVIEW} mốc khác
                </Tag>
              </li>
            )}
          </ul>
        )}
      </Link>

      <div className="post-foot">
        <LikeButton
          canLike={canLike}
          liked={like?.liked}
          count={like?.likeCount ?? post.likeCount}
          loading={liking}
          onToggle={onToggleLike}
        />
        <Link to={`${to}#comments`}>
          <CommentOutlined /> {post.commentCount} bình luận
        </Link>
        <Link to={to} className="post-open">
          Xem bài <RightOutlined />
        </Link>
      </div>
    </CardWrapper>
  );
};

export default CommunityPostCard;
