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

const Overview = styled.section`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 168px), 1fr));
  gap: 10px;
`;

const MetricButton = styled(Button)`
  && {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    height: 100%;
    min-height: 106px;
    padding: 12px;
    white-space: normal;
    text-align: left;
    border-color: #cbd5e1;
  }

  &&[aria-pressed='true'] {
    border-color: #1677ff;
    background: #eff6ff;
    box-shadow: inset 0 0 0 1px #1677ff;
  }

  &&:focus-visible {
    outline: 2px solid #0958d9;
    outline-offset: 2px;
  }
`;

const Count = styled.span`
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
`;

interface OverviewProps {
  date: string;
  counts?: ReceptionTodayCounts;
  error?: string;
  selected?: ReceptionTodayKey;
  onSelect: (status: ReceptionTodayGroup['status']) => void;
  onRetry: () => void;
}

const ReceptionTodayOverview = ({
  date,
  counts,
  error,
  selected,
  onSelect,
  onRetry,
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
      </Metrics>
    ) : (
      <div role="status" aria-label="Đang tải tổng quan hôm nay">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </div>
    )}
  </Overview>
);

export default ReceptionTodayOverview;
