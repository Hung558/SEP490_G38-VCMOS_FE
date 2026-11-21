import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Select, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import CommunityModerationService, {
  isReportedComment,
  MODERATION_PAGE_SIZE,
  REPORT_STATUS_FILTERS,
  type ContentReport,
  type ModerationPost,
  type ModerationTargetType,
  type ReportsResult,
  type ReportStatusFilter,
} from '@/services/CommunityModerationService';
import { readCommunityError } from '@/services/CommunityService';
import ResolveReportModal from './ResolveReportModal';
import TargetPreviewModal, { type PreviewTarget } from './TargetPreviewModal';
import {
  CommentStatusTag,
  formatDateTime,
  PostStatusTag,
  ReportStatusTag,
  userLine,
} from './labels';
import { CellText, FilterRow } from './styles';

interface Query {
  status: ReportStatusFilter;
  targetType?: ModerationTargetType;
  page: number;
}

const TARGET_OPTIONS: { value: ModerationTargetType; label: string }[] = [
  { value: 'Post', label: 'Bài viết' },
  { value: 'Comment', label: 'Bình luận' },
];

const previewOf = (report: ContentReport): PreviewTarget => {
  if (!report.target) return { kind: 'missing' };
  if (isReportedComment(report))
    return { kind: 'comment', comment: report.target };
  return { kind: 'post', post: report.target as ModerationPost };
};

const TargetCell = ({ report }: { report: ContentReport }) => {
  if (!report.target)
    return (
      <CellText>
        <Tag>{report.targetType === 'Comment' ? 'Bình luận' : 'Bài viết'}</Tag>
        <span className="sub">Nội dung không còn tồn tại</span>
      </CellText>
    );
  if (isReportedComment(report)) {
    const comment = report.target;
    return (
      <CellText>
        <Space size={4} wrap>
          <Tag color="purple">Bình luận</Tag>
          <CommentStatusTag status={comment.status} />
        </Space>
        <p className="excerpt">{comment.content}</p>
        <span className="sub">Người viết: {userLine(comment.authorId)}</span>
        {comment.postId && (
          <span className="sub">
            Trong bài: {comment.postId.content || 'Bài chia sẻ hành trình'}
          </span>
        )}
      </CellText>
    );
  }
  const post = report.target as ModerationPost;
  return (
    <CellText>
      <Space size={4} wrap>
        <Tag color="geekblue">Bài viết</Tag>
        <PostStatusTag status={post.status} />
      </Space>
      <p className="excerpt">
        {post.content ||
          `Chia sẻ ${post.timelineItems?.length || 0} mốc hành trình`}
      </p>
      <span className="sub">Tác giả: {userLine(post.authorId)}</span>
    </CellText>
  );
};

/**
 * UC-59, nghiệp vụ 7.1: reports from pet owners on posts and comments. Admin
 * keeps, hides or deletes the content; pending reports are shown oldest first.
 */
const ModerationReportsTab = () => {
  const [query, setQuery] = useState<Query>({ status: 'Pending', page: 1 });
  const [result, setResult] = useState<ReportsResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [resolving, setResolving] = useState<ContentReport | null>(null);
  const reload = () => setAttempt(value => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    CommunityModerationService.listReports(
      { ...query, limit: MODERATION_PAGE_SIZE },
      { signal: controller.signal }
    )
      .then(data => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, data.pagination.totalPages);
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
          readCommunityError(failure, 'Không tải được danh sách báo cáo.')
            .message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt]);

  return (
    <>
      <FilterRow>
        <Select
          aria-label="Lọc trạng thái báo cáo"
          value={query.status}
          style={{ minWidth: 160 }}
          options={REPORT_STATUS_FILTERS}
          onChange={status =>
            setQuery(value => ({ ...value, status, page: 1 }))
          }
        />
        <Select
          aria-label="Lọc nội dung bị báo cáo"
          allowClear
          placeholder="Bài viết và bình luận"
          value={query.targetType}
          style={{ minWidth: 200 }}
          options={TARGET_OPTIONS}
          onChange={targetType =>
            setQuery(value => ({ ...value, targetType, page: 1 }))
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
        <Table<ContentReport>
          rowKey="_id"
          loading={loading}
          dataSource={result?.reports || []}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  query.status === 'Pending'
                    ? 'Không có báo cáo nào chờ xử lý.'
                    : 'Không có báo cáo phù hợp.'
                }
              />
            ),
          }}
          pagination={{
            current: query.page,
            pageSize: MODERATION_PAGE_SIZE,
            total: result?.pagination.total || 0,
            showSizeChanger: false,
            showTotal: total => `${total} báo cáo`,
            onChange: page => setQuery(value => ({ ...value, page })),
          }}
          columns={[
            {
              title: 'Nội dung bị báo cáo',
              key: 'target',
              render: (_, report) => <TargetCell report={report} />,
            },
            {
              title: 'Lý do',
              dataIndex: 'reason',
              width: 200,
              render: (reason: string) => (
                <CellText>
                  <p className="excerpt">{reason}</p>
                </CellText>
              ),
            },
            {
              title: 'Người báo cáo',
              key: 'reporter',
              width: 170,
              render: (_, report) => (
                <CellText>
                  <span>{report.reporterId?.fullName || 'Không rõ tên'}</span>
                  <span className="sub">
                    {formatDateTime(report.createdAt)}
                  </span>
                </CellText>
              ),
            },
            {
              title: 'Số lượt',
              dataIndex: 'reportCount',
              width: 90,
              align: 'center',
            },
            {
              title: 'Trạng thái',
              key: 'status',
              width: 160,
              render: (_, report) => (
                <CellText>
                  <ReportStatusTag status={report.status} />
                  {report.resolvedById && (
                    <span className="sub">
                      Bởi {report.resolvedById.fullName || 'quản trị viên'}
                    </span>
                  )}
                </CellText>
              ),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 160,
              render: (_, report) => (
                <Space wrap size={[8, 8]}>
                  <Button
                    size="small"
                    onClick={() => setPreview(previewOf(report))}
                  >
                    Xem
                  </Button>
                  {report.status === 'Pending' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setResolving(report)}
                    >
                      Xử lý
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      <TargetPreviewModal target={preview} onClose={() => setPreview(null)} />
      <ResolveReportModal
        report={resolving}
        onClose={() => setResolving(null)}
        onDone={() => {
          setResolving(null);
          reload();
        }}
      />
    </>
  );
};

export default ModerationReportsTab;
