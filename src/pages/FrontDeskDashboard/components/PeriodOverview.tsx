import { Alert } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  GlobalOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import type { FrontDeskReport } from '@/services/ReportService';
import {
  BarList,
  Caption,
  InfoTip,
  MeterList,
  Panel,
  PanelGrid,
  Stack,
  StatGrid,
  StatTile,
  SubHeading,
} from '@/components/dashboard';
import {
  APPOINTMENT_STATUSES,
  formatAverageWait,
  formatReportDate,
  formatReportMoney,
  formatReportNumber,
  hasPeriodActivity,
  PAYMENT_LABELS,
} from './helpers';
import { Divider, FigureGrid } from './styles';

interface Props {
  report: FrontDeskReport;
}

const rateText = (rate?: number) =>
  rate === undefined ? '' : ` · ${formatReportNumber(rate)}% đang dùng`;

/**
 * Period statistics of the front-desk report: appointments, wait time,
 * invoices and money collected, and the cage snapshot. Also shown in the
 * Admin overview's "Quầy lễ tân" tab.
 */
export default function PeriodOverview({ report }: Props) {
  const stats = report.periodStats;
  const invoices = stats.invoices;
  const cages = stats.cageOccupancy;
  const range = `${formatReportDate(report.from)} – ${formatReportDate(report.to)}`;

  return (
    <Stack $gap={20}>
      {!hasPeriodActivity(stats) && (
        <Alert
          type="info"
          showIcon
          message="Chưa có lịch hẹn hoặc hóa đơn trong kỳ này."
          description="Số liệu chuồng vẫn phản ánh tình hình hiện tại, không phải dữ liệu trong kỳ."
        />
      )}

      <StatGrid>
        <StatTile
          icon={<CalendarOutlined />}
          label="Tổng lịch hẹn trong kỳ"
          value={formatReportNumber(stats.totalAppointments)}
          caption="Theo ngày hẹn, mọi trạng thái"
        />
        <StatTile
          icon={<GlobalOutlined />}
          tone="blue"
          label="Đặt trực tuyến"
          value={formatReportNumber(stats.onlineCount)}
          caption="Kênh Online trong kỳ"
        />
        <StatTile
          icon={<ShopOutlined />}
          tone="violet"
          label="Tiếp nhận tại quầy"
          value={formatReportNumber(stats.walkInCount)}
          caption="Kênh Walk-in trong kỳ"
        />
        <StatTile
          icon={<ClockCircleOutlined />}
          tone="amber"
          label={
            <>
              Thời gian chờ trung bình{' '}
              <InfoTip text="Từ lúc tiếp nhận đến lần bắt đầu dịch vụ đầu tiên. Không tính thời gian đang chờ chưa bắt đầu." />
            </>
          }
          value={formatAverageWait(stats.averageWaitMinutes)}
          textValue={stats.averageWaitMinutes === null}
          caption={`${formatReportNumber(stats.waitTimeSampleCount)} lịch có mẫu hợp lệ`}
        />
      </StatGrid>

      <PanelGrid $min={320}>
        <Panel
          title="Lịch hẹn theo trạng thái"
          info={`Trạng thái hiện tại của lịch có ngày hẹn trong khoảng ${range}.`}
        >
          <BarList
            whole={stats.totalAppointments}
            items={APPOINTMENT_STATUSES.map(([key, label]) => ({
              key,
              label,
              value: stats.appointmentsByStatus[key] ?? 0,
              display: formatReportNumber(stats.appointmentsByStatus[key] ?? 0),
            }))}
          />
        </Panel>

        <Panel
          title="Hóa đơn và tiền đã thu"
          info="Số hóa đơn lập và số chưa thanh toán tính theo ngày lập hóa đơn. Số đã thanh toán và tiền đã thu tính theo ngày thanh toán, có thể gồm hóa đơn lập trước kỳ. Không dùng hai số này để tính tỷ lệ thanh toán."
        >
          <FigureGrid>
            <div>
              <dt>Hóa đơn lập trong kỳ</dt>
              <dd>{formatReportNumber(invoices.issuedCount)}</dd>
            </div>
            <div>
              <dt>Chưa thanh toán · lập trong kỳ</dt>
              <dd>{formatReportNumber(invoices.unpaidCount)}</dd>
            </div>
            <div>
              <dt>Hóa đơn thanh toán trong kỳ</dt>
              <dd>{formatReportNumber(invoices.paidCount)}</dd>
            </div>
            <div>
              <dt>Tổng tiền đã thu trong kỳ</dt>
              <dd>{formatReportMoney(invoices.totalCollected)}</dd>
            </div>
          </FigureGrid>
          <Divider />
          <Stack $gap={12}>
            <SubHeading>
              Tiền đã thu theo phương thức
              <InfoTip text="Chỉ hóa đơn đã thanh toán, theo ngày thanh toán trong kỳ. Không phải số hóa đơn lập trong kỳ." />
            </SubHeading>
            <BarList
              whole={invoices.totalCollected}
              emptyText="Chưa có khoản thu theo phương thức thanh toán."
              items={invoices.byPaymentMethod.map(method => ({
                key: method.paymentMethod,
                label:
                  PAYMENT_LABELS[method.paymentMethod] || method.paymentMethod,
                value: method.revenue,
                display: formatReportMoney(method.revenue),
                sub: `${formatReportNumber(method.invoiceCount)} hóa đơn`,
              }))}
            />
          </Stack>
          <Caption style={{ marginTop: 14 }}>
            Lập/chưa thanh toán theo ngày lập; đã thanh toán và tiền thu theo
            ngày thanh toán.
          </Caption>
        </Panel>

        <Panel
          title="Phân bổ chuồng · ảnh chụp hiện tại"
          info="Số liệu hiện tại, không phải mức sử dụng trung bình trong kỳ. Chuồng cách ly là tập con trong các khu, không cộng thêm vào tổng chuồng."
        >
          <MeterList
            items={[
              {
                key: 'all',
                label: 'Toàn phòng khám',
                used: cages.occupied,
                total: cages.total,
                caption: `Còn trống ${formatReportNumber(cages.available)}${rateText(cages.occupancyRate)}`,
              },
              {
                key: 'holding',
                label: 'Khu chờ',
                used: cages.byZone.Holding.occupied,
                total: cages.byZone.Holding.total,
                caption: `Còn trống ${formatReportNumber(cages.byZone.Holding.available)}${rateText(cages.byZone.Holding.occupancyRate)}`,
              },
              {
                key: 'inpatient',
                label: 'Khu nội trú',
                used: cages.byZone.InpatientWard.occupied,
                total: cages.byZone.InpatientWard.total,
                caption: `Còn trống ${formatReportNumber(cages.byZone.InpatientWard.available)}${rateText(cages.byZone.InpatientWard.occupancyRate)}`,
              },
              {
                key: 'isolated',
                label: 'Trong đó: chuồng cách ly',
                used: cages.isolatedCages.occupied,
                total: cages.isolatedCages.total,
                caption: `Còn trống ${formatReportNumber(cages.isolatedCages.available)}`,
              },
            ]}
          />
        </Panel>
      </PanelGrid>
    </Stack>
  );
}
