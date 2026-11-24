import React from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { StatGrid, StatTile } from '@/components/dashboard';

interface Props {
  summary: { total: number; active: number; inactive: number } | null;
  failed: boolean;
  onRetry: () => void;
}

/** Counts over the whole catalogue, whatever the table filters say */
const ServiceSummaryBar: React.FC<Props> = ({ summary, failed, onRetry }) => {
  if (failed)
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu dịch vụ"
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  if (!summary)
    return <Skeleton active title={false} paragraph={{ rows: 1 }} />;
  const count = (value: number) => value.toLocaleString('vi-VN');
  return (
    <StatGrid $min={180}>
      <StatTile
        icon={<AppstoreOutlined />}
        tone="slate"
        label="Tổng số dịch vụ"
        value={count(summary.total)}
      />
      <StatTile
        icon={<CheckCircleOutlined />}
        label="Đang cung cấp"
        value={count(summary.active)}
      />
      <StatTile
        icon={<PauseCircleOutlined />}
        tone="amber"
        label="Ngừng cung cấp"
        value={count(summary.inactive)}
      />
    </StatGrid>
  );
};

export default ServiceSummaryBar;
