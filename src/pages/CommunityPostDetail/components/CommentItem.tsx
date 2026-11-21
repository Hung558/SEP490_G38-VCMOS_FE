import type { ReactNode } from 'react';
import { Avatar, Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import {
  authorName,
  isOwnContent,
  type CommunityComment,
} from '@/services/CommunityService';
import { CommentWrapper } from './styles';

interface CommentItemProps {
  comment: CommunityComment;
  isReply?: boolean;
  canInteract: boolean;
  userId?: string;
  deleting?: boolean;
  /** Root comments only (BR-19: replies are one level deep) */
  onReply?: () => void;
  onDelete: () => Promise<void>;
  onReport: () => void;
  /** Replies and the reply form, under a root comment */
  children?: ReactNode;
}

const CommentItem = ({
  comment,
  isReply,
  canInteract,
  userId,
  deleting,
  onReply,
  onDelete,
  onReport,
  children,
}: CommentItemProps) => {
  const name = authorName(comment.authorId);
  const own = isOwnContent(comment.authorId, userId);

  return (
    <CommentWrapper $reply={isReply}>
      <Avatar
        size={isReply ? 28 : 34}
        style={{ backgroundColor: own ? '#0d9488' : '#94a3b8', flexShrink: 0 }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <div className="comment-main">
        <div className="comment-bubble">
          <span className="comment-author">{name}</span>
          <p className="comment-text">{comment.content}</p>
        </div>
        <div className="comment-actions">
          <time dateTime={comment.createdAt}>
            {dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}
          </time>
          {canInteract && onReply && (
            <Button type="link" onClick={onReply}>
              Trả lời
            </Button>
          )}
          {canInteract && own && (
            <Popconfirm
              title="Xóa bình luận này?"
              description={
                isReply
                  ? undefined
                  : 'Các câu trả lời bên dưới cũng không còn hiện.'
              }
              okText="Xóa"
              cancelText="Giữ lại"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button type="link" danger loading={deleting}>
                Xóa
              </Button>
            </Popconfirm>
          )}
          {canInteract && !own && (
            <Button type="link" onClick={onReport}>
              Báo cáo
            </Button>
          )}
        </div>
        {children}
      </div>
    </CommentWrapper>
  );
};

export default CommentItem;
