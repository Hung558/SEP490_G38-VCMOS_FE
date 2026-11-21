import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Modal, Result, Skeleton, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  CommentOutlined,
  FlagOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import ROUTER from '@/routerMap/ROUTER';
import CommunityPostBody from '@/components/community/CommunityPostBody';
import LikeButton from '@/components/community/LikeButton';
import ReportModal from '@/components/community/ReportModal';
import { useCommunityLikes } from '@/components/community/useCommunityLikes';
import { useCommunityViewer } from '@/components/community/useCommunityViewer';
import {
  POST_TYPE_LABELS,
  safePostImageUrl,
} from '@/services/CommunityPostService';
import CommunityService, {
  authorName,
  canWithdrawPost,
  feedTabToParam,
  isOwnContent,
  readCommunityError,
  type PublicCommunityPost,
  type ReportTargetType,
} from '@/services/CommunityService';
import CommentSection from './components/CommentSection';
import { DetailWrapper } from './components/styles';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

/** One Published post with its likes, comments and replies (SCR-14) */
const CommunityPostDetailPage = () => {
  const { postId = '' } = useParams<{ postId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const viewer = useCommunityViewer();
  const [post, setPost] = useState<PublicCommunityPost>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: string;
  } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const withdrawingRef = useRef(false);
  const [modal, contextHolder] = Modal.useModal();
  const { likes, pending, toggle } = useCommunityLikes(
    post ? [post._id] : [],
    viewer.canInteract
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    CommunityService.getPublicPost(postId, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setPost(result.post);
        setCommentCount(result.post.commentCount);
        setLoadState('ready');
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        const status = readCommunityError(failure, '').status;
        // 400 = malformed id; 404 = not Published (pending, hidden or withdrawn)
        setLoadState(status === 400 || status === 404 ? 'notFound' : 'error');
      });
    return () => controller.abort();
  }, [postId, attempt]);

  // "N bình luận" on a feed card links to #comments
  const scrollToComments = useCallback(() => {
    if (location.hash !== '#comments') return;
    requestAnimationFrame(() =>
      document.getElementById('comments')?.scrollIntoView({ block: 'start' })
    );
  }, [location.hash]);

  const feedLink = `${ROUTER.COMMUNITY}?tab=${feedTabToParam(
    post?.postType || 'TimelineShare'
  )}`;

  const withdraw = () => {
    if (!post) return;
    modal.confirm({
      title: 'Thu hồi bài viết khỏi cộng đồng?',
      content:
        'Bài sẽ không còn hiện trên cộng đồng và không đăng lại được. Bạn vẫn xem lại được trong "Bài viết của tôi".',
      okText: 'Thu hồi',
      okButtonProps: { danger: true },
      cancelText: 'Giữ bài',
      onOk: async () => {
        if (withdrawingRef.current) return;
        withdrawingRef.current = true;
        setWithdrawing(true);
        try {
          const result = await CommunityService.withdrawPost(post._id);
          toast.success(result.message || 'Đã thu hồi bài viết.');
          navigate(ROUTER.MY_COMMUNITY_POSTS);
        } catch (failure) {
          toast.error(
            readCommunityError(failure, 'Chưa thu hồi được bài viết.').message
          );
        } finally {
          withdrawingRef.current = false;
          setWithdrawing(false);
        }
      },
    });
  };

  if (loadState === 'loading')
    return (
      <DetailWrapper>
        <div className="post-card">
          <Skeleton active avatar paragraph={{ rows: 5 }} />
        </div>
      </DetailWrapper>
    );

  if (loadState === 'notFound' || loadState === 'error' || !post)
    return (
      <DetailWrapper>
        <Result
          status={loadState === 'error' ? 'error' : '404'}
          title={
            loadState === 'error'
              ? 'Không tải được bài viết'
              : 'Bài viết không còn trên cộng đồng'
          }
          subTitle={
            loadState === 'error'
              ? 'Vui lòng kiểm tra kết nối rồi thử lại.'
              : 'Bài viết không tồn tại, đang chờ duyệt hoặc đã bị gỡ.'
          }
          extra={[
            loadState === 'error' && (
              <Button
                key="retry"
                type="primary"
                onClick={() => setAttempt(value => value + 1)}
              >
                Thử lại
              </Button>
            ),
            <Button key="feed" onClick={() => navigate(ROUTER.COMMUNITY)}>
              Về cộng đồng
            </Button>,
          ]}
        />
      </DetailWrapper>
    );

  const own = isOwnContent(post.authorId, viewer.userId);
  const name = authorName(post.authorId);
  const pet = post.petId;
  const like = likes[post._id];

  return (
    <DetailWrapper>
      {contextHolder}
      <Link to={feedLink} className="back-link">
        <ArrowLeftOutlined /> Cộng đồng
      </Link>

      <article className="post-card" aria-label={`Bài viết của ${name}`}>
        <div className="post-head">
          <Avatar
            size={52}
            src={safePostImageUrl(pet?.photoUrl)}
            style={{ backgroundColor: '#0d9488', flexShrink: 0 }}
          >
            {(pet?.name || name).charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="post-author">{name}</span>
            <span className="post-meta">
              {[
                pet
                  ? [pet.name, pet.species, pet.breed]
                      .filter(Boolean)
                      .join(' · ')
                  : '',
                dayjs(post.createdAt).format('DD/MM/YYYY HH:mm'),
              ]
                .filter(Boolean)
                .join(' — ')}
            </span>
          </div>
          <Tag color={post.postType === 'TimelineShare' ? 'cyan' : 'blue'}>
            {POST_TYPE_LABELS[post.postType] || post.postType}
          </Tag>
        </div>

        <CommunityPostBody post={post} />

        <div className="post-actions">
          <LikeButton
            canLike={viewer.canInteract}
            liked={like?.liked}
            count={like?.likeCount ?? post.likeCount}
            loading={pending[post._id]}
            onToggle={() => void toggle(post._id)}
          />
          <span className="comment-count">
            <CommentOutlined /> {commentCount} bình luận
          </span>
          <div className="post-actions-right">
            {viewer.canInteract && own && canWithdrawPost(post.status) && (
              <Button
                icon={<RollbackOutlined />}
                loading={withdrawing}
                onClick={withdraw}
              >
                Thu hồi bài viết
              </Button>
            )}
            {viewer.canInteract && !own && (
              <Button
                icon={<FlagOutlined />}
                onClick={() => setReportTarget({ type: 'Post', id: post._id })}
              >
                Báo cáo
              </Button>
            )}
          </div>
        </div>
      </article>

      <section id="comments" className="comments" aria-label="Bình luận">
        <CommentSection
          key={post._id}
          postId={post._id}
          commentCount={commentCount}
          canInteract={viewer.canInteract}
          signedIn={viewer.signedIn}
          userId={viewer.userId}
          onCountChange={setCommentCount}
          onReport={commentId =>
            setReportTarget({ type: 'Comment', id: commentId })
          }
          onLoaded={scrollToComments}
        />
      </section>

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </DetailWrapper>
  );
};

export default CommunityPostDetailPage;
