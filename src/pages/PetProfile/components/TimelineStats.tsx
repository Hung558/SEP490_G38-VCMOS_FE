import { Statistic } from 'antd';
import styled from 'styled-components';
import type { PetTimelineSummary } from '@/services/PetTimelineService';

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
  .ant-statistic {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
  }
  .ant-statistic-title {
    color: #334155;
    font-size: 13px;
    font-weight: 600;
  }
  .ant-statistic-content {
    font-size: 24px;
    font-weight: 700;
  }
`;

const TimelineStats = ({ summary }: { summary: PetTimelineSummary }) => (
  <Stats aria-label="Tổng quan hành trình">
    {[
      { title: 'Lượt hẹn', value: summary.totalVisits, color: '#0f172a' },
      {
        title: 'Đã hoàn tất',
        value: summary.completedVisits,
        color: '#166534',
      },
      { title: 'Đang xử lý', value: summary.activeVisits, color: '#9a3412' },
      {
        title: 'Bệnh án',
        value: summary.totalMedicalRecords,
        color: '#1e40af',
      },
      {
        title: 'Ghi nhận chăm sóc',
        value: summary.totalGroomingNotes,
        color: '#6b21a8',
      },
      {
        title: 'Đợt nội trú',
        value: summary.totalInpatientStays,
        color: '#115e59',
      },
    ].map(item => (
      <Statistic
        key={item.title}
        title={item.title}
        value={item.value}
        valueStyle={{ color: item.color }}
      />
    ))}
  </Stats>
);
export default TimelineStats;
