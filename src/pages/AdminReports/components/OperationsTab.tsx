import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ShoppingOutlined,
  SmileOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type { OperationsReport } from '@/services/ReportService';
import {
  BarList,
  MeterList,
  Panel,
  PanelGrid,
  SplitBar,
  Stack,
  StatGrid,
  StatTile,
  SubHeading,
  VIZ,
} from '@/components/dashboard';
import {
  categoryLabels,
  count,
  pct,
  STATUS_ORDER,
  statusLabels,
} from './labels';

const ServiceName = styled.span`
  display: block;

  .name {
    display: block;
    font-weight: 600;
    color: ${VIZ.text};
  }
  .code {
    display: block;
    font-size: 12px;
    color: ${VIZ.textMuted};
  }
`;

// 24/11: the states that need attention stand out (icon + status colour)
const STATUS_TONES: Record<string, 'warning' | 'critical' | undefined> = {
  Overdue: 'warning',
  Cancelled: 'critical',
};

const Gap = styled.div`
  height: 1px;
  background: #f1f5f9;
  margin: 18px 0 14px;
`;

export default function OperationsTab({
  operations,
}: {
  operations: OperationsReport;
}) {
  const { appointments, cageOccupancy: cages, overview } = operations;
  const statusKeys = [
    ...STATUS_ORDER,
    ...Object.keys(appointments.byStatus).filter(
      key => !(STATUS_ORDER as readonly string[]).includes(key)
    ),
  ];
  const zoneCaption = (available: number, rate?: number) =>
    `Còn trống ${count(available)}${rate === undefined ? '' : ` · ${pct(rate)} đang dùng`}`;

  return (
    <Stack $gap={20}>
      <StatGrid>
        <StatTile
          icon={<CalendarOutlined />}
          label="Tổng lịch hẹn"
          value={count(appointments.total)}
          caption="Theo ngày hẹn trong kỳ"
        />
        <StatTile
          icon={<CheckCircleOutlined />}
          tone="blue"
          label="Tỷ lệ hoàn tất"
          value={pct(appointments.completionRate)}
        />
        <StatTile
          icon={<ExclamationCircleOutlined />}
          tone="amber"
          label="Tỷ lệ quá hạn"
          value={pct(appointments.overdueRate)}
        />
        <StatTile
          icon={<CloseCircleOutlined />}
          tone="rose"
          label="Tỷ lệ đã hủy"
          value={pct(appointments.cancellationRate)}
        />
      </StatGrid>

      <PanelGrid $min={340}>
        <Panel title="Trạng thái lịch hẹn trong kỳ">
          <BarList
            whole={appointments.total}
            items={statusKeys.map(key => ({
              key,
              label: statusLabels[key] || key,
              value:
                appointments.byStatus[
                  key as keyof typeof appointments.byStatus
                ] ?? 0,
              display: count(
                appointments.byStatus[key as keyof typeof appointments.byStatus]
              ),
              tone: STATUS_TONES[key],
            }))}
          />
          <Gap />
          <SubHeading style={{ marginBottom: 12 }}>Kênh đặt lịch</SubHeading>
          <SplitBar
            label="Kênh đặt lịch"
            parts={[
              {
                key: 'online',
                label: 'Online',
                value: appointments.byChannel.online,
                color: VIZ.accent,
                note: pct(appointments.byChannel.onlineRate),
              },
              {
                key: 'walkin',
                label: 'Walk-in',
                value: appointments.byChannel.walkIn,
                color: VIZ.series2,
                note: pct(appointments.byChannel.walkInRate),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Dịch vụ theo nhóm trong kỳ"
          info="Lượt tính theo ngày hẹn trong kỳ, không gồm dịch vụ đã hủy; số hoàn tất hiển thị riêng."
        >
          <BarList
            emptyText="Chưa có lượt dịch vụ trong kỳ."
            items={operations.servicesByCategory.map(item => ({
              key: item.category,
              label: categoryLabels[item.category] || item.category,
              value: item.totalCount,
              display: `${count(item.totalCount)} lượt`,
              sub: `hoàn tất ${count(item.doneCount)}`,
            }))}
          />
        </Panel>
      </PanelGrid>

      {/* 24/11: ranked horizontal bars, long Vietnamese names read in full */}
      <Panel title="Dịch vụ được sử dụng nhiều">
        <BarList
          emptyText="Chưa có lượt sử dụng dịch vụ trong kỳ."
          items={operations.topServices.map(service => ({
            key: service.serviceId,
            label: (
              <ServiceName>
                <span className="name">
                  {service.rank}. {service.name}
                </span>
                <span className="code">
                  {[
                    service.code,
                    service.category
                      ? categoryLabels[service.category] || service.category
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              </ServiceName>
            ),
            value: service.count,
            display: `${count(service.count)} lượt`,
            sub: `hoàn tất ${count(service.doneCount)}`,
          }))}
        />
      </Panel>

      <PanelGrid $min={340}>
        <Panel
          title="Tình trạng chuồng hiện tại"
          info="Ảnh chụp hiện tại, không phải dữ liệu lịch sử. Chuồng cách ly đã được tính trong các khu phía trên."
        >
          <MeterList
            items={[
              {
                key: 'holding',
                label: 'Khu lưu giữ',
                used: cages.byZone.Holding.occupied,
                total: cages.byZone.Holding.total,
                caption: zoneCaption(
                  cages.byZone.Holding.available,
                  cages.byZone.Holding.occupancyRate
                ),
              },
              {
                key: 'inpatient',
                label: 'Khu nội trú',
                used: cages.byZone.InpatientWard.occupied,
                total: cages.byZone.InpatientWard.total,
                caption: zoneCaption(
                  cages.byZone.InpatientWard.available,
                  cages.byZone.InpatientWard.occupancyRate
                ),
              },
              {
                key: 'all',
                label: 'Toàn bộ',
                used: cages.occupied,
                total: cages.total,
                caption: zoneCaption(cages.available, cages.occupancyRate),
              },
              {
                key: 'isolated',
                label: 'Trong đó: chuồng cách ly',
                used: cages.isolatedCages.occupied,
                total: cages.isolatedCages.total,
                caption: zoneCaption(cages.isolatedCages.available),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Tổng quan danh mục hiện tại"
          info="Ảnh chụp hiện tại, không phụ thuộc kỳ báo cáo."
        >
          <StatGrid $min={170}>
            <StatTile
              icon={<TeamOutlined />}
              label="Khách hàng hoạt động"
              value={count(overview.activeCustomersCount)}
            />
            <StatTile
              icon={<SmileOutlined />}
              tone="blue"
              label="Thú cưng hoạt động"
              value={count(overview.activePetsCount)}
            />
            <StatTile
              icon={<ShoppingOutlined />}
              tone="violet"
              label="Sản phẩm hoạt động"
              value={count(overview.activeProductsCount)}
            />
            <StatTile
              icon={<StopOutlined />}
              tone="slate"
              label="Sản phẩm ngừng hoạt động"
              value={count(overview.inactiveProductsCount)}
            />
          </StatGrid>
        </Panel>
      </PanelGrid>
    </Stack>
  );
}
