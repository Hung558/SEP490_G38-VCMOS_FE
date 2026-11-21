import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Popconfirm, Select, Space, Table } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { toast } from 'sonner';
import CommunityModerationService, {
  MODERATION_PAGE_SIZE,
  MODERATION_POST_FILTERS,
  type ModerationPost,
  type ModerationPostStatusFilter,
  type ModerationPostsResult,
} from '@/services/CommunityModerationService';
import {
  POST_TYPE_LABELS,
  POST_TYPES,
  type CommunityPostType,
} from '@/services/CommunityPostService';
import { readCommunityError } from '@/services/CommunityService';
import RejectPostModal from './RejectPostModal';
import TargetPreviewModal, { type PreviewTarget } from './TargetPreviewModal';
import {
  formatDateTime,
  PostStatusTag,
  PostTypeTag,
  SensitiveTags,
  userLine,
} from './labels';
import { CellText, FilterRow } from './styles';

interface Query {
  status: ModerationPostStatusFilter;
  postType?: CommunityPostType;
  page: number;
}

const postSummary = (post: ModerationPost) =>
  post.content ||
  (post.timelineItems.length
    ? `Chia sẻ ${post.timelineItems.length} mốc hành trình`
    : 'Không có lời nhắn');

/**
 * UC-57, UC-58: posts wait in this queue (oldest first) until Admin approves
 * them (Published) or rejects them with a reason (Hidden). Nghiệp vụ 7.1:
 * both timeline shares and discussions are reviewed before they show.
 */
const ModerationPostsTab = () => {
  const [query, setQuery] = useState<Query>({
    status: 'PendingReview',
    page: 1,
  });
  const [result, setResult] = useState<ModerationPostsResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [rejecting, setRejecting] = useState<ModerationPost | null>(null);
  const [approvingId, setApprovingId] = useState<string>();
  const reload = () => setAttempt(value => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    CommunityModerationService.listPosts(
      { ...query, limit: MODERATION_PAGE_SIZE },
      { signal: controller.signal }
    )
      .then(data => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, data.pagination.totalPages);
        // Approving the last post of a page empties it
        if (query.page > lastPage) {
          setQuery(value => ({ ...value, page: lastPage }));
          return;
        }
        setResult(data);
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setResult(undefined);
        setError(
          readCommunityError(failure, 'Không tải được danh sách bài viết.')
            .message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt]);

  const approve = async (post: ModerationPost) => {
    setApprovingId(post._id);
    try {
      const response = await CommunityModerationService.moderatePost(
        post._id,
        'Approve'
      );
      toast.success(response.message || 'Đã duyệt và đăng bài viết.');
    } catch (failure) {
      const { status, message } = readCommunityError(
        failure,
        'Chưa duyệt được bài viết. Vui lòng thử lại.'
      );
      if (status === 409 || status === 404) toast.warning(message);
      else toast.error(message);
    } finally {
      setApprovingId(undefined);
      reload();
    }
  };

  return (
    <>
      <FilterRow>
        <Select
          aria-label="Lọc trạng thái bài viết"
          value={query.status}
          style={{ minWidth: 170 }}
          options={MODERATION_POST_FILTERS}
          onChange={status =>
            setQuery(value => ({ ...value, status, page: 1 }))
          }
        />
        <Select
          aria-label="Lọc loại bài viết"
          allowClear
          placeholder="Tất cả loại bài"
          value={query.postType}
          style={{ minWidth: 190 }}
          options={POST_TYPES.map(value => ({
            value,
            label: POST_TYPE_LABELS[value],
          }))}
          onChange={postType =>
            setQuery(value => ({ ...value, postType, page: 1 }))
          }
        />
        <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
          Làm mới
        </Button>
      </FilterRow>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={<span role="alert">{error}</span>}
          action={<Button onClick={reload}>Thử lại</Button>}
        />
      ) : (
        <Table<ModerationPost>
          rowKey="_id"
          loading={loading}
          dataSource={result?.posts || []}
          scroll={{ x: 980 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  query.status === 'PendingReview'
                    ? 'Không có bài nào chờ duyệt.'
                    : 'Không có bài viết phù hợp.'
                }
              />
            ),
          }}
          pagination={{
            current: query.page,
            pageSize: MODERATION_PAGE_SIZE,
            total: result?.pagination.total || 0,
            showSizeChanger: false,
            showTotal: total => `${total} bài viết`,
            onChange: page => setQuery(value => ({ ...value, page })),
          }}
          columns={[
            {
              title: 'Bài viết',
              key: 'post',
              render: (_, post) => (
                <CellText>
                  <PostTypeTag type={post.postType} />
                  <p className="excerpt">{postSummary(post)}</p>
                  <SensitiveTags matches={post.sensitiveMatches} />
                </CellText>
              ),
            },
            {
              title: 'Tác giả',
              key: 'author',
              width: 200,
              render: (_, post) => (
                <CellText>
                  <span>{post.authorId?.fullName || 'Không rõ tên'}</span>
                  <span className="sub">
                    {[post.authorId?.code, post.authorId?.phone]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </CellText>
              ),
            },
            {
              title: 'Thú cưng',
              key: 'pet',
              width: 140,
              render: (_, post) => post.petId?.name || '—',
            },
            {
              title: 'Gửi lúc',
              dataIndex: 'createdAt',
              width: 140,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              width: 170,
              render: (_, post) => (
                <CellText>
                  <PostStatusTag status={post.status} />
                  {post.moderationNote && (
                    <span className="sub">Lý do: {post.moderationNote}</span>
                  )}
                </CellText>
              ),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 220,
              render: (_, post) => (
                <Space wrap size={[8, 8]}>
                  <Button
                    size="small"
                    onClick={() => setPreview({ kind: 'post', post })}
                  >
                    Xem
                  </Button>
                  {post.status === 'PendingReview' && (
                    <>
                      <Popconfirm
                        title="Duyệt và đăng bài này?"
                        description="Bài sẽ hiện trên cộng đồng cho mọi người."
                        okText="Duyệt"
                        cancelText="Hủy"
                        onConfirm={() => approve(post)}
                      >
                        <Button
                          size="small"
                          type="primary"
                          loading={approvingId === post._id}
                          aria-label={`Duyệt bài của ${userLine(post.authorId)}`}
                        >
                          Duyệt
                        </Button>
                      </Popconfirm>
                      <Button
                        size="small"
                        danger
                        disabled={approvingId === post._id}
                        onClick={() => setRejecting(post)}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      <TargetPreviewModal target={preview} onClose={() => setPreview(null)} />
      <RejectPostModal
        post={rejecting}
        onClose={() => setRejecting(null)}
        onDone={() => {
          setRejecting(null);
          reload();
        }}
      />
    </>
  );
};

export default ModerationPostsTab;
