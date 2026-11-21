import { Button } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const LikeCount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 14px;
`;

interface LikeButtonProps {
  liked?: boolean;
  count: number;
  /** Pet owners like; everyone else only sees the count */
  canLike: boolean;
  loading?: boolean;
  onToggle?: () => void;
}

/** One like per account (BR-19): pressing again takes the like back */
const LikeButton = ({
  liked = false,
  count,
  canLike,
  loading,
  onToggle,
}: LikeButtonProps) => {
  if (!canLike)
    return (
      <LikeCount aria-label={`${count} lượt thích`}>
        <HeartOutlined /> {count}
      </LikeCount>
    );
  return (
    <Button
      type="text"
      aria-pressed={liked}
      aria-label={liked ? `Bỏ thích (${count})` : `Thích (${count})`}
      icon={
        liked ? <HeartFilled style={{ color: '#e11d48' }} /> : <HeartOutlined />
      }
      loading={loading}
      onClick={onToggle}
      style={{ color: liked ? '#e11d48' : '#475569', paddingInline: 8 }}
    >
      {count}
    </Button>
  );
};

export default LikeButton;
