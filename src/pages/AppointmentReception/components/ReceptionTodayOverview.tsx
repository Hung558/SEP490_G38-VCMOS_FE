import { Alert, Button, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { RECEPTION_TODAY_GROUPS } from './receptionToday';
import type {
  ReceptionTodayCounts,
  ReceptionTodayGroup,
  ReceptionTodayKey,
} from './receptionToday';

const { Title, Text } = Typography;

// Same look as the count strips of the other admin/clinic pages (24/11); each
// counter stays a button that filters the list
const Overview = styled.section`
  margin-bottom: 16px;

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px 16px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
`;

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 14px;
`;

const MetricButton = styled(Button)`
  && {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 2px;
    height: 100%;
    min-height: 92px;
    padding: 14px 16px;
    white-space: normal;
    text-align: left;
    border: 1px solid #edf1f5;
    border-radius: 12px;
    box-shadow: none;
    color: #64748b;
    font-size: 13px;
  }

  &&:hover {
    border-color: #0d9488;
    color: #64748b;
  }

  &&[aria-pressed='true'] {
    border-color: #0d9488;
    background: #f0fdfa;
    box-shadow: inset 0 0 0 1px #0d9488;
  }

  &&:focus-visible {
    outline: 2px solid #0d9488;
    outline-offset: 2px;
  }

  .ant-typography {
    font-size: 12.5px;
  }
`;

const Count = styled.span`
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
`;

interface OverviewProps {
  date: string;
  counts?: ReceptionTodayCounts;
  error?: string;
  selected?: ReceptionTodayKey;
  onSelect: (status: ReceptionTodayGroup['status']) => void;
  onRetry: () => void;
  /** Available / total cages; null while unknown */
  cages?: { available: number; total: number } | null;
  /** SCR-16 quick action: the cage counter opens the cage board */
  onOpenCages?: () => void;
}

const ReceptionTodayOverview = ({
  date,
  counts,
  error,
  selected,
  onSelect,
  onRetry,
  cages,
  onOpenCages,
}: OverviewProps) => (
  <Overview
    aria-labelledby="reception-today-title"
    aria-busy={!counts && !error}
  >
    <header>
      <Title id="reception-today-title" level={4} style={{ margin: 0 }}>
        Lịch hẹn hôm nay
      </Title>
      <Text type="secondary">
        <time dateTime={date}>{dayjs(date).format('DD/MM/YYYY')}</time> · Giờ
        Việt Nam
      </Text>
    </header>
    {error ? (
      <Alert
        type="warning"
        showIcon
        message="Không tải được tổng quan hôm nay"
        description={error}
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    ) : counts ? (
      <Metrics>
        {RECEPTION_TODAY_GROUPS.map(group => (
          <MetricButton
            key={group.key}
            aria-label={`${group.label}: ${counts[group.key]}`}
            aria-pressed={selected === group.key}
            onClick={() => onSelect(group.status)}
          >
            <span>{group.label}</span>
            <Count>{counts[group.key]}</Count>
            {group.key === 'total' && (
              <Text type="secondary">Mọi trạng thái, kể cả lịch đã hủy</Text>
            )}
          </MetricButton>
        ))}
        {onOpenCages && (
          <MetricButton
            aria-label={
              cages
                ? `Chuồng trống: ${cages.available} trên ${cages.total}`
                : 'Chuồng trống: đang tải'
            }
            onClick={onOpenCages}
          >
            <span>Chuồng trống</span>
            <Count>{cages ? `${cages.available} / ${cages.total}` : '…'}</Count>
            <Text type="secondary">Mở sơ đồ chuồng</Text>
          </MetricButton>
        )}
      </Metrics>
    ) : (
      <div role="status" aria-label="Đang tải tổng quan hôm nay">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </div>
    )}
  </Overview>
);

export default ReceptionTodayOverview;
