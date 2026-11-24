import { Card, Descriptions, Progress, Typography } from 'antd';
import type { FrontDeskReport } from '@/services/ReportService';
import { formatReportNumber } from './helpers';
import { Help } from './styles';

interface Props {
  report: FrontDeskReport;
}

// Current cages, whatever the period filter says. Today's appointment counters
// are not repeated here: the reception screen already lists today's queue.
export default function CageOverview({ report }: Props) {
  const { cages } = report.todayCounters;
  return (
    <Card size="small" title="Chuồng hiện tại · toàn phòng khám">
      <Descriptions
        column={3}
        items={[
          {
            key: 'available',
            label: 'Chuồng trống',
            children: (
              <Typography.Text strong>
                {formatReportNumber(cages.available)}
              </Typography.Text>
            ),
          },
          {
            key: 'occupied',
            label: 'Đang sử dụng',
            children: formatReportNumber(cages.occupied),
          },
          {
            key: 'total',
            label: 'Tổng số chuồng',
            children: formatReportNumber(cages.total),
          },
        ]}
      />
      <Progress
        percent={cages.occupancyRate}
        format={() =>
          `${formatReportNumber(cages.occupancyRate)}% đang sử dụng`
        }
        status="normal"
        aria-label={`Tỷ lệ chuồng đang sử dụng: ${formatReportNumber(cages.occupancyRate)} phần trăm`}
      />
      <Help>
        Chuồng trống chưa đồng nghĩa phù hợp với một thú cưng cụ thể. Kiểm tra
        khu vực, cân nặng và yêu cầu cách ly trước khi bố trí.
      </Help>
      {cages.total === 0 && <Help>Chưa có chuồng được thiết lập.</Help>}
    </Card>
  );
}
