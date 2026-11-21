import {
  Card,
  Descriptions,
  Progress,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import type { FrontDeskReport } from '@/services/ReportService';
import { formatReportDate, formatReportNumber } from './helpers';
import { Help, MetricGrid } from './styles';

interface Props {
  report: FrontDeskReport;
}
export default function LiveOverview({ report }: Props) {
  const live = report.todayCounters;
  return (
    <section aria-labelledby="front-desk-live-title">
      <Space wrap>
        <Typography.Title
          id="front-desk-live-title"
          level={3}
          style={{ margin: 0 }}
        >
          Trực tiếp tại quầy
        </Typography.Title>
        <Tag color="blue">Không phụ thuộc kỳ thống kê</Tag>
      </Space>
      <Help>
        Ngày vận hành: {formatReportDate(report.today)} (UTC+7). Đây là số liệu
        ở lần tải gần nhất; nhấn Làm mới để cập nhật.
      </Help>
      <MetricGrid>
        <Card size="small">
          <Statistic
            title="Lịch đặt hôm nay chưa tiếp nhận"
            value={live.expectedToday}
            formatter={value => formatReportNumber(Number(value))}
          />
          <Help>
            Chỉ lịch có trạng thái Đã đặt (Booked), ngày hẹn là hôm nay.
          </Help>
        </Card>
        <Card size="small">
          <Statistic
            title="Đã tiếp nhận, đang chờ · trực tiếp"
            value={live.checkedInNow}
            formatter={value => formatReportNumber(Number(value))}
          />
          <Help>
            Tất cả lịch đang CheckedIn, kể cả lịch có ngày hẹn khác hôm nay.
          </Help>
        </Card>
        <Card size="small">
          <Statistic
            title="Đang thực hiện · trực tiếp"
            value={live.inProgressNow}
            formatter={value => formatReportNumber(Number(value))}
          />
          <Help>Tất cả lịch đang InProgress, không giới hạn ngày hẹn.</Help>
        </Card>
        <Card size="small">
          <Statistic
            title="Chờ chủ đón · trực tiếp"
            value={live.waitingForPickup}
            formatter={value => formatReportNumber(Number(value))}
          />
          <Help>Tất cả lịch đang WaitOwner, không giới hạn ngày hẹn.</Help>
        </Card>
      </MetricGrid>
      <Card
        size="small"
        title="Chuồng hiện tại · toàn phòng khám"
        style={{ marginTop: 16 }}
      >
        <Descriptions
          column={3}
          items={[
            {
              key: 'available',
              label: 'Chuồng trống',
              children: (
                <Typography.Text strong>
                  {formatReportNumber(live.cages.available)}
                </Typography.Text>
              ),
            },
            {
              key: 'occupied',
              label: 'Đang sử dụng',
              children: formatReportNumber(live.cages.occupied),
            },
            {
              key: 'total',
              label: 'Tổng số chuồng',
              children: formatReportNumber(live.cages.total),
            },
          ]}
        />
        <Progress
          percent={live.cages.occupancyRate}
          format={() =>
            `${formatReportNumber(live.cages.occupancyRate)}% đang sử dụng`
          }
          status="normal"
          aria-label={`Tỷ lệ chuồng đang sử dụng: ${formatReportNumber(live.cages.occupancyRate)} phần trăm`}
        />
        <Help>
          Chuồng trống chưa đồng nghĩa phù hợp với một thú cưng cụ thể. Kiểm tra
          khu vực, cân nặng và yêu cầu cách ly trước khi bố trí.
        </Help>
        {live.cages.total === 0 && <Help>Chưa có chuồng được thiết lập.</Help>}
      </Card>
    </section>
  );
}
