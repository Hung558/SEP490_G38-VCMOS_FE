import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import {
  Alert,
  Button,
  Card,
  Empty,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useAuth } from '@/contexts/routerProvider/authContext';
import CommunityPostService, {
  POST_STATUSES,
  POST_STATUS_LABELS,
  POST_TYPES,
  POST_TYPE_LABELS,
  readCommunityPostError,
} from '@/services/CommunityPostService';
import type {
  CommunityPost,
  CommunityPostsQuery,
  CommunityPostsResult,
} from '@/services/CommunityPostService';
import PostDetail, { formatPostDate, postStatusColor } from './PostDetail';
import PostEditor from './PostEditor';
import './styles.css';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

function MyCommunityPosts() {
  const [query, setQuery] = useState<CommunityPostsQuery>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [result, setResult] = useState<CommunityPostsResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // "Viết bài trao đổi" on the community page and the home page opens the editor
  const composeRequested = params.get('compose') === '1';
  const [editor, setEditor] = useState<{ post?: CommunityPost } | undefined>(
    composeRequested ? {} : undefined
  );
  const [success, setSuccess] = useState<string>();
  const reload = () => setRevision(value => value + 1);
  useEffect(() => {
    if (!composeRequested) return;
    setParams(
      previous => {
        const next = new URLSearchParams(previous);
        next.delete('compose');
        return next;
      },
      { replace: true }
    );
  }, [composeRequested, setParams]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    CommunityPostService.listMine(query, abort.signal)
      .then(data => {
        if (abort.signal.aborted) return;
        if ((query.page || 1) > Math.max(1, data.pagination.totalPages)) {
          setQuery(value => ({
            ...value,
            page: Math.max(1, data.pagination.totalPages),
          }));
        } else setResult(data);
      })
      .catch(failure => {
        if (!abort.signal.aborted)
          setError(
            readCommunityPostError(
              failure,
              'Không tải được bài viết. Vui lòng thử lại.'
            ).message
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [query, revision]);

  return (
    <main className="community-posts-page">
      <Card>
        <header className="community-page-header">
          <div>
            <Title level={2} style={{ margin: '0 0 8px' }}>
              Bài viết của tôi
            </Title>
            <Text type="secondary">
              Quản lý các bài thảo luận và hành trình bạn đã gửi. Đây không phải
              bảng tin cộng đồng công khai.
            </Text>
          </div>
          <Space wrap>
            <Button onClick={() => navigate(ROUTER.COMMUNITY)}>
              Xem cộng đồng
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setSuccess(undefined);
                setEditor({});
              }}
            >
              Viết bài mới
            </Button>
          </Space>
        </header>
        {success && (
          <Alert
            type="success"
            showIcon
            closable
            onClose={() => setSuccess(undefined)}
            message={<span role="status">{success}</span>}
          />
        )}
        <Space wrap className="community-post-filters">
          <Select
            allowClear
            aria-label="Lọc trạng thái duyệt bài"
            placeholder="Tất cả trạng thái"
            value={query.status}
            style={{ minWidth: 190 }}
            options={POST_STATUSES.map(value => ({
              value,
              label: POST_STATUS_LABELS[value],
            }))}
            onChange={status =>
              setQuery(value => ({ ...value, status, page: 1 }))
            }
          />
          <Select
            allowClear
            aria-label="Lọc loại bài viết"
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
          <Button loading={loading} onClick={reload}>
            Làm mới
          </Button>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message={<span role="alert">{error}</span>}
            action={<Button onClick={reload}>Thử lại</Button>}
          />
        ) : (
          <Table<CommunityPost>
            rowKey="_id"
            loading={loading}
            dataSource={result?.posts || []}
            scroll={{ x: 820 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có bài viết phù hợp. Bạn có thể viết bài mới hoặc thay đổi bộ lọc."
                />
              ),
            }}
            pagination={{
              current: query.page,
              pageSize: PAGE_SIZE,
              total: result?.pagination.total || 0,
              showSizeChanger: false,
              showTotal: total => `${total} bài viết`,
              onChange: page => setQuery(value => ({ ...value, page })),
            }}
            columns={[
              {
                title: 'Bài viết',
                key: 'content',
                render: (_, post) => (
                  <div>
                    <Text strong>
                      {POST_TYPE_LABELS[post.postType] || post.postType}
                    </Text>
                    <p className="community-list-excerpt">
                      {post.content ||
                        post.timelineItems[0]?.title ||
                        'Chia sẻ hành trình'}
                    </p>
                  </div>
                ),
              },
              {
                title: 'Thú cưng',
                key: 'pet',
                render: (_, post) =>
                  typeof post.petId === 'object' && post.petId
                    ? post.petId.name
                    : '—',
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                render: (status: CommunityPost['status']) => (
                  <Tag color={postStatusColor(status)}>
                    {POST_STATUS_LABELS[status] || status}
                  </Tag>
                ),
              },
              {
                title: 'Ngày gửi',
                dataIndex: 'createdAt',
                render: formatPostDate,
              },
              {
                title: 'Thao tác',
                key: 'actions',
                render: (_, post) => (
                  <Button
                    onClick={() => setSelectedId(post._id)}
                    aria-label={`Xem bài ${post.content.slice(0, 35) || POST_TYPE_LABELS[post.postType]}`}
                  >
                    Xem chi tiết
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
      {selectedId && !editor && (
        <PostDetail
          key={selectedId}
          id={selectedId}
          revision={revision}
          onClose={() => setSelectedId(undefined)}
          onEdit={post => setEditor({ post })}
          onChanged={reload}
        />
      )}
      {editor && (
        <PostEditor
          post={editor.post}
          onClose={() => {
            setEditor(undefined);
            reload();
          }}
          onSaved={post => {
            setSuccess(
              editor.post
                ? 'Đã cập nhật bài viết. Bài vẫn đang chờ duyệt.'
                : 'Đã gửi bài viết, vui lòng chờ duyệt.'
            );
            setEditor(undefined);
            setSelectedId(post._id);
            reload();
          }}
        />
      )}
    </main>
  );
}

export default function CommunityPostsPage() {
  const { user } = useAuth();
  const role = (user?.role || user?.systemRole || '').trim().toLowerCase();
  const accountKey = user?._id || user?.email;
  if (role !== 'petowner' || !accountKey)
    return (
      <main className="community-posts-page">
        <Alert
          type="warning"
          showIcon
          message="Bài viết của tôi chỉ dành cho chủ nuôi đã đăng nhập."
        />
      </main>
    );
  return <MyCommunityPosts key={accountKey} />;
}
