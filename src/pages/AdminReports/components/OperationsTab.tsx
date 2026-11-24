import { Table, Tag } from 'antd';
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

const Rank = styled.span<{ $top: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  background: ${p => (p.$top ? VIZ.accentWash : '#f1f5f9')};
  color: ${p => (p.$top ? VIZ.accentStrong : VIZ.textSecondary)};
`;

const ServiceName = styled.div`
  .name {
    font-weight: 600;
    color: ${VIZ.text};
  }
  .code {
    font-size: 12px;
    color: ${VIZ.textMuted};
  }
`;

const UseCount = styled.div`
  display: grid;
  gap: 4px;
  min-width: 90px;
  font-variant-numeric: tabular-nums;

  .bar {
    height: 6px;
    border-radius: 9999px;
    background: ${VIZ.accentWash};
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 9999px;
    background: ${VIZ.accent};
  }
`;

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
  const topCount = Math.max(1, ...operations.topServices.map(s => s.count));
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

      <Panel title="Dịch vụ được sử dụng nhiều">
        <Table
          size="small"
          rowKey="serviceId"
          pagination={false}
          dataSource={operations.topServices}
          columns={[
            {
              title: 'Hạng',
              dataIndex: 'rank',
              width: 70,
              render: (rank: number) => <Rank $top={rank <= 3}>{rank}</Rank>,
            },
            {
              title: 'Dịch vụ',
              dataIndex: 'name',
              render: (_: string, row) => (
                <ServiceName>
                  <div className="name">{row.name}</div>
                  <div className="code">{row.code || '—'}</div>
                </ServiceName>
              ),
            },
            {
              title: 'Nhóm',
              dataIndex: 'category',
              width: 150,
              render: (value: string | null) =>
                value ? <Tag>{categoryLabels[value] || value}</Tag> : '—',
            },
            {
              title: 'Lượt',
              dataIndex: 'count',
              width: 150,
              render: (value: number) => (
                <UseCount>
                  <span>{count(value)}</span>
                  <div className="bar" aria-hidden>
                    <div
                      className="fill"
                      style={{ width: `${(value / topCount) * 100}%` }}
                    />
                  </div>
                </UseCount>
              ),
            },
            {
              title: 'Hoàn tất',
              dataIndex: 'doneCount',
              width: 100,
              align: 'right',
              render: (value: number) => count(value),
            },
          ]}
          locale={{ emptyText: 'Chưa có lượt sử dụng dịch vụ trong kỳ' }}
          scroll={{ x: 600 }}
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
