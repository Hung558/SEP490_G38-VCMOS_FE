import { Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
  type CommunityPostStatus,
  type CommunityPostType,
} from '@/services/CommunityPostService';
import {
  COMMENT_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  type ModerationUser,
  type ReportStatus,
} from '@/services/CommunityModerationService';
import type { CommunityCommentStatus } from '@/services/CommunityService';

const POST_STATUS_COLORS: Record<CommunityPostStatus, string> = {
  PendingReview: 'gold',
  Published: 'green',
  Hidden: 'orange',
  Removed: 'default',
};

export const PostStatusTag = ({ status }: { status: CommunityPostStatus }) => (
  <Tag color={POST_STATUS_COLORS[status]}>
    {POST_STATUS_LABELS[status] || status}
  </Tag>
);

export const PostTypeTag = ({ type }: { type: CommunityPostType }) => (
  <Tag color={type === 'TimelineShare' ? 'cyan' : 'blue'}>
    {POST_TYPE_LABELS[type] || type}
  </Tag>
);

export const CommentStatusTag = ({
  status,
}: {
  status: CommunityCommentStatus;
}) => (
  <Tag color={status === 'Published' ? 'green' : 'default'}>
    {COMMENT_STATUS_LABELS[status] || status}
  </Tag>
);

export const ReportStatusTag = ({ status }: { status: ReportStatus }) => (
  <Tag color={status === 'Pending' ? 'red' : 'green'}>
    {REPORT_STATUS_LABELS[status] || status}
  </Tag>
);

/** K5: medical or price words the BE found, to look at before approving */
export const SensitiveTags = ({ matches }: { matches?: string[] }) =>
  matches?.length ? (
    <div className="sensitive">
      <Tag color="orange" icon={<WarningOutlined />}>
        Có từ khóa nhạy cảm
      </Tag>
      {matches.slice(0, 6).map(word => (
        <Tag key={word}>{word}</Tag>
      ))}
    </div>
  ) : null;

export const userLine = (user?: ModerationUser | null) =>
  user
    ? [user.fullName || 'Không rõ tên', user.code, user.phone]
        .filter(Boolean)
        .join(' · ')
    : 'Không rõ người dùng';

export const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
