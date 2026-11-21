import { Alert, Button, Descriptions, Modal, Typography } from 'antd';
import { generatePath, Link } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import CommunityPostBody from '@/components/community/CommunityPostBody';
import type {
  ModerationPost,
  ReportedComment,
} from '@/services/CommunityModerationService';
import {
  CommentStatusTag,
  formatDateTime,
  PostStatusTag,
  PostTypeTag,
  SensitiveTags,
  userLine,
} from './labels';
import { CellText } from './styles';

const { Paragraph, Text } = Typography;

export type PreviewTarget =
  | { kind: 'post'; post: ModerationPost }
  | { kind: 'comment'; comment: ReportedComment }
  | { kind: 'missing' };

interface TargetPreviewModalProps {
  target: PreviewTarget | null;
  onClose: () => void;
}

const PostPreview = ({ post }: { post: ModerationPost }) => (
  <>
    <Descriptions
      size="small"
      column={{ xs: 1, sm: 2 }}
      items={[
        {
          key: 'type',
          label: 'Loại bài',
          children: <PostTypeTag type={post.postType} />,
        },
        {
          key: 'status',
          label: 'Trạng thái',
          children: <PostStatusTag status={post.status} />,
        },
        { key: 'author', label: 'Tác giả', children: userLine(post.authorId) },
        {
          key: 'pet',
          label: 'Thú cưng',
          children: post.petId
            ? [post.petId.name, post.petId.code, post.petId.species]
                .filter(Boolean)
                .join(' · ')
            : 'Không gắn thú cưng',
        },
        {
          key: 'created',
          label: 'Gửi lúc',
          children: formatDateTime(post.createdAt),
        },
        {
          key: 'counts',
          label: 'Tương tác',
          children: `${post.likeCount} lượt thích · ${post.commentCount} bình luận`,
        },
      ]}
    />
    {post.moderationNote && (
      <Alert
        type="warning"
        showIcon
        style={{ margin: '12px 0' }}
        message="Ghi chú kiểm duyệt"
        description={post.moderationNote}
      />
    )}
    <CellText>
      <SensitiveTags matches={post.sensitiveMatches} />
    </CellText>
    <div style={{ marginTop: 16 }}>
      <CommunityPostBody post={post} emptyText="Bài không có lời nhắn." />
    </div>
  </>
);

const CommentPreview = ({ comment }: { comment: ReportedComment }) => (
  <>
    <Descriptions
      size="small"
      column={1}
      items={[
        {
          key: 'author',
          label: 'Người viết',
          children: userLine(comment.authorId),
        },
        {
          key: 'status',
          label: 'Trạng thái',
          children: <CommentStatusTag status={comment.status} />,
        },
        {
          key: 'created',
          label: 'Viết lúc',
          children: formatDateTime(comment.createdAt),
        },
      ]}
    />
    <Paragraph
      style={{
        marginTop: 12,
        padding: 12,
        background: '#f8fafc',
        borderRadius: 8,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {comment.content}
    </Paragraph>
    {comment.postId ? (
      <>
        <Text strong>Trong bài viết</Text>{' '}
        <PostStatusTag status={comment.postId.status} />
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 3 }}
          style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}
        >
          {comment.postId.content ||
            'Bài chia sẻ hành trình không có lời nhắn.'}
        </Paragraph>
        {comment.postId.status === 'Published' && (
          <Link
            to={generatePath(ROUTER.COMMUNITY_POST, {
              postId: comment.postId._id,
            })}
            target="_blank"
          >
            Mở bài trên cộng đồng
          </Link>
        )}
      </>
    ) : (
      <Text type="secondary">Bài viết chứa bình luận không còn tồn tại.</Text>
    )}
  </>
);

/** Full content of a post or a reported comment, read before deciding */
const TargetPreviewModal = ({ target, onClose }: TargetPreviewModalProps) => (
  <Modal
    open={Boolean(target)}
    title={
      target?.kind === 'comment' ? 'Bình luận bị báo cáo' : 'Nội dung bài viết'
    }
    width={760}
    onCancel={onClose}
    footer={<Button onClick={onClose}>Đóng</Button>}
    destroyOnHidden
  >
    {target?.kind === 'post' && <PostPreview post={target.post} />}
    {target?.kind === 'comment' && <CommentPreview comment={target.comment} />}
    {target?.kind === 'missing' && (
      <Alert
        type="info"
        showIcon
        message="Nội dung bị báo cáo không còn tồn tại."
      />
    )}
  </Modal>
);

export default TargetPreviewModal;
