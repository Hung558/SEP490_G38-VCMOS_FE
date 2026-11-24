import {
  BuildOutlined,
  CarOutlined,
  LoginOutlined,
  MedicineBoxOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import type { FrontDeskReport } from '@/services/ReportService';
import {
  InfoTip,
  Stack,
  StatGrid,
  StatTile,
  SubHeading,
} from '@/components/dashboard';
import PeriodOverview from '@/pages/FrontDeskDashboard/components/PeriodOverview';
import { count, dateLabel, pct } from './labels';

/** The reception desk now (today's counters) and over the report period */
export default function FrontDeskTab({
  frontDesk,
}: {
  frontDesk: FrontDeskReport;
}) {
  const { todayCounters: today } = frontDesk;
  return (
    <Stack $gap={20}>
      <SubHeading>
        Ngay lúc này
        <span className="note">
          · ngày vận hành {dateLabel(frontDesk.today, frontDesk.today)} (UTC+7)
        </span>
        <InfoTip text="Tình hình tại lần tải gần nhất. Chỉ lịch đặt chưa tiếp nhận giới hạn trong hôm nay; các ca đã đến, đang thực hiện và chờ đón tính mọi ngày hẹn." />
      </SubHeading>
      <StatGrid $min={180}>
        <StatTile
          icon={<ScheduleOutlined />}
          label="Lịch đặt hôm nay chưa tiếp nhận"
          value={count(today.expectedToday)}
        />
        <StatTile
          icon={<LoginOutlined />}
          tone="blue"
          label="Đã check-in"
          value={count(today.checkedInNow)}
        />
        <StatTile
          icon={<MedicineBoxOutlined />}
          tone="violet"
          label="Đang khám"
          value={count(today.inProgressNow)}
        />
        <StatTile
          icon={<CarOutlined />}
          tone="amber"
          label="Chờ đón"
          value={count(today.waitingForPickup)}
        />
        <StatTile
          icon={<BuildOutlined />}
          tone="slate"
          label="Chuồng đang dùng"
          value={`${count(today.cages.occupied)}/${count(today.cages.total)}`}
          caption={`Còn trống ${count(today.cages.available)} · lấp đầy ${pct(today.cages.occupancyRate)}`}
        />
      </StatGrid>

      <SubHeading style={{ marginTop: 4 }}>
        Trong kỳ
        <span className="note">
          · {dateLabel(frontDesk.from, frontDesk.to)}
        </span>
      </SubHeading>
      <PeriodOverview report={frontDesk} />
    </Stack>
  );
}
