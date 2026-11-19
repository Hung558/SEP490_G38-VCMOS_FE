import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Modal,
  Space,
  Spin,
  Tag,
} from 'antd';
import CommunityPostService, {
  canManagePost,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  readCommunityPostError,
  safePostImageUrl,
} from '@/services/CommunityPostService';
import type { CommunityPost } from '@/services/CommunityPostService';

export const postStatusColor = (status: string) =>
  ({
    PendingReview: 'gold',
    Published: 'green',
    Hidden: 'orange',
    Removed: 'default',
  })[status];
export const formatPostDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(date);
};

interface Props {
  id: string;
  revision: number;
  onClose: () => void;
  onEdit: (post: CommunityPost) => void;
  onChanged: () => void;
}

export default function PostDetail({
  id,
  revision,
  onClose,
  onEdit,
  onChanged,
}: Props) {
  const [post, setPost] = useState<CommunityPost>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleteLocked, setDeleteLocked] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(undefined);
    setPost(undefined);
    CommunityPostService.getMine(id, abort.signal)
      .then(result => {
        if (!abort.signal.aborted) setPost(result.post);
      })
      .catch(failure => {
        if (!abort.signal.aborted)
          setError(
            readCommunityPostError(failure, 'Không tải được bài viết.').message
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, revision, version]);

  const remove = async () => {
    if (deletingRef.current || !post || !canManagePost(post) || deleteLocked)
      return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await CommunityPostService.remove(post._id);
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch (failure) {
      const result = readCommunityPostError(
        failure,
        'Chưa xóa được bài viết. Vui lòng thử lại.'
      );
      setDeleteError(result.message);
      if (result.status === 409 || result.status === 404) {
        setDeleteLocked(true);
        onChanged();
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open
        title="Chi tiết bài viết của tôi"
        width={850}
        onCancel={() => {
          if (!deletingRef.current) onClose();
        }}
        footer={
          <Space wrap>
            <Button onClick={onClose} disabled={deleting}>
              Đóng
            </Button>
            {post && canManagePost(post) && !loading && (
              <>
                <Button onClick={() => onEdit(post)} disabled={deleting}>
                  Sửa bài viết
                </Button>
                <Button
                  danger
                  disabled={deleting || deleteLocked}
                  onClick={() => {
                    setDeleteError(undefined);
                    setConfirmDelete(true);
                  }}
                >
                  Xóa bài viết
                </Button>
              </>
            )}
          </Space>
        }
      >
        {loading ? (
          <div role="status" className="community-loading">
            <Spin />
            <p>Đang tải bài viết…</p>
          </div>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            message={<span role="alert">{error}</span>}
            action={
              <Button onClick={() => setVersion(value => value + 1)}>
                Thử lại
              </Button>
            }
          />
        ) : post ? (
          <article className="community-post-detail">
            <Descriptions
              column={2}
              size="small"
              items={[
                {
                  key: 'type',
                  label: 'Loại bài',
                  children: POST_TYPE_LABELS[post.postType] || post.postType,
                },
                {
                  key: 'status',
                  label: 'Trạng thái',
                  children: (
                    <Tag color={postStatusColor(post.status)}>
                      {POST_STATUS_LABELS[post.status] || post.status}
                    </Tag>
                  ),
                },
                {
                  key: 'created',
                  label: 'Ngày gửi',
                  children: formatPostDate(post.createdAt),
                },
                {
                  key: 'updated',
                  label: 'Cập nhật',
                  children: formatPostDate(post.updatedAt),
                },
                {
                  key: 'pet',
                  label: 'Thú cưng',
                  children:
                    typeof post.petId === 'object' && post.petId
                      ? `${post.petId.name}${post.petId.code ? ` · ${post.petId.code}` : ''}`
                      : 'Không có thông tin thú cưng',
                },
              ]}
            />
            <Alert
              type={canManagePost(post) ? 'info' : 'warning'}
              showIcon
              message={
                canManagePost(post)
                  ? 'Bài đang chờ duyệt. Bạn có thể chỉnh sửa hoặc xóa.'
                  : 'Bài không còn chờ duyệt nên không thể chỉnh sửa hoặc xóa.'
              }
            />
            {post.moderationNote && (
              <section>
                <h3>Ghi chú duyệt bài</h3>
                <p className="community-text">{post.moderationNote}</p>
              </section>
            )}
            <section>
              <h3>Nội dung</h3>
              <p className="community-text">
                {post.content || 'Không có nội dung bổ sung.'}
              </p>
            </section>
            {safePostImageUrl(post.imageUrl) && (
              <img
                src={safePostImageUrl(post.imageUrl)}
                alt="Ảnh bìa bài viết"
                className="community-detail-image"
              />
            )}
            {post.postType === 'TimelineShare' && (
              <section>
                <h3>Hành trình được chia sẻ</h3>
                <p className="community-help">
                  Các mốc do tác giả nhập, không phải dữ liệu tự đồng bộ từ lịch
                  hẹn hoặc hồ sơ khám.
                </p>
                <ol className="community-timeline">
                  {post.timelineItems.map((item, index) => (
                    <li key={item._id || index}>
                      <time dateTime={item.date}>
                        {item.date.split('-').reverse().join('/')}
                      </time>
                      <h4>{item.title}</h4>
                      {safePostImageUrl(item.imageUrl) && (
                        <img
                          src={safePostImageUrl(item.imageUrl)}
                          alt={item.title}
                          className="community-detail-image"
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </article>
        ) : (
          <Empty description="Không tìm thấy bài viết." />
        )}
      </Modal>
      <Modal
        open={confirmDelete}
        title="Xóa bài viết đang chờ duyệt?"
        onCancel={() => {
          if (!deletingRef.current) setConfirmDelete(false);
        }}
        maskClosable={false}
        closable={!deleting}
        keyboard={!deleting}
        footer={
          <Space>
            <Button disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Giữ bài viết
            </Button>
            <Button
              danger
              type="primary"
              disabled={deleteLocked}
              loading={deleting}
              onClick={remove}
            >
              Xác nhận xóa
            </Button>
          </Space>
        }
      >
        <p>
          Bài sẽ chuyển sang trạng thái Đã xóa và không còn được sửa. Bạn vẫn có
          thể xem lại trong danh sách bài của mình.
        </p>
        {deleteError && (
          <Alert
            type="error"
            showIcon
            message={<span role="alert">{deleteError}</span>}
          />
        )}
      </Modal>
    </>
  );
}
