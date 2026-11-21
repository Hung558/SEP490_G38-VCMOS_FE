import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Skeleton, Typography } from 'antd';
import { toast } from 'sonner';
import CommunityService, {
  addCommentToThread,
  appendCommentPage,
  COMMENT_PAGE_SIZE,
  readCommunityError,
  removeCommentFromThread,
  type CommunityComment,
  type CommunityPagination,
} from '@/services/CommunityService';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

const { Title, Text } = Typography;

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  canInteract: boolean;
  signedIn: boolean;
  userId?: string;
  onCountChange: (count: number) => void;
  onReport: (commentId: string) => void;
  /** Called once the first page is on screen (to honour a #comments link) */
  onLoaded?: () => void;
}

/**
 * Nghiệp vụ 3.4 (UC-54, UC-55): comments and one level of replies (BR-19).
 * Everyone reads; pet owners write, reply, delete their own and report others.
 */
const CommentSection = ({
  postId,
  commentCount,
  canInteract,
  signedIn,
  userId,
  onCountChange,
  onReport,
  onLoaded,
}: CommentSectionProps) => {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [pagination, setPagination] = useState<CommunityPagination>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    CommunityService.listComments(
      postId,
      { page: 1, limit: COMMENT_PAGE_SIZE },
      { signal: controller.signal }
    )
      .then(result => {
        if (controller.signal.aborted) return;
        setComments(result.comments);
        setPagination(result.pagination);
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setError(
          readCommunityError(
            failure,
            'Không tải được bình luận. Vui lòng thử lại.'
          ).message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [postId, attempt]);

  useEffect(() => {
    if (!loading) onLoaded?.();
  }, [loading, onLoaded]);

  const loadMore = async () => {
    if (!pagination || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await CommunityService.listComments(postId, {
        page: pagination.page + 1,
        limit: COMMENT_PAGE_SIZE,
      });
      setComments(current => appendCommentPage(current, result.comments));
      setPagination(result.pagination);
    } catch (failure) {
      toast.error(
        readCommunityError(failure, 'Không tải thêm được bình luận.').message
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const create = useCallback(
    async (content: string, parentCommentId?: string) => {
      const result = await CommunityService.createComment(
        postId,
        content,
        parentCommentId
      );
      setComments(current => addCommentToThread(current, result.comment));
      onCountChange(result.commentCount);
      if (parentCommentId) setReplyTo(null);
    },
    [postId, onCountChange]
  );

  const remove = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const result = await CommunityService.deleteComment(commentId);
      setComments(current => removeCommentFromThread(current, commentId));
      onCountChange(result.commentCount);
      toast.success(result.message || 'Đã xóa bình luận.');
    } catch (failure) {
      toast.error(
        readCommunityError(failure, 'Chưa xóa được bình luận.').message
      );
    } finally {
      setDeletingId(undefined);
    }
  };

  const hasMore = Boolean(
    pagination && pagination.page < pagination.totalPages
  );

  return (
    <>
      <Title level={4} style={{ marginTop: 0 }}>
        Bình luận ({commentCount})
      </Title>
      {canInteract ? (
        <CommentForm
          id="community-comment"
          label="Viết bình luận"
          placeholder="Viết bình luận…"
          submitText="Gửi bình luận"
          onSubmit={content => create(content)}
        />
      ) : (
        <Text type="secondary">
          {signedIn
            ? 'Chỉ tài khoản chủ nuôi mới bình luận được.'
            : 'Đăng nhập bằng tài khoản chủ nuôi để bình luận.'}
        </Text>
      )}

      {error ? (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 16 }}
          message={<span role="alert">{error}</span>}
          action={
            <Button onClick={() => setAttempt(value => value + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : loading ? (
        <Skeleton active avatar paragraph={{ rows: 2 }} />
      ) : comments.length ? (
        <div style={{ marginTop: 12 }}>
          {comments.map(comment => (
            <CommentItem
              key={comment._id}
              comment={comment}
              canInteract={canInteract}
              userId={userId}
              deleting={deletingId === comment._id}
              onReply={() =>
                setReplyTo(current =>
                  current === comment._id ? null : comment._id
                )
              }
              onDelete={() => remove(comment._id)}
              onReport={() => onReport(comment._id)}
            >
              {(comment.replies?.length || replyTo === comment._id) && (
                <div className="comment-replies">
                  {comment.replies?.map(reply => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      isReply
                      canInteract={canInteract}
                      userId={userId}
                      deleting={deletingId === reply._id}
                      onDelete={() => remove(reply._id)}
                      onReport={() => onReport(reply._id)}
                    />
                  ))}
                  {canInteract && replyTo === comment._id && (
                    <CommentForm
                      id={`community-reply-${comment._id}`}
                      label="Viết câu trả lời"
                      placeholder="Viết câu trả lời…"
                      submitText="Trả lời"
                      autoFocus
                      onCancel={() => setReplyTo(null)}
                      onSubmit={content => create(content, comment._id)}
                    />
                  )}
                </div>
              )}
            </CommentItem>
          ))}
          {hasMore && (
            <Button
              type="link"
              loading={loadingMore}
              onClick={loadMore}
              style={{ paddingInline: 0 }}
            >
              Xem thêm bình luận
            </Button>
          )}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có bình luận nào."
        />
      )}
    </>
  );
};

export default CommentSection;
