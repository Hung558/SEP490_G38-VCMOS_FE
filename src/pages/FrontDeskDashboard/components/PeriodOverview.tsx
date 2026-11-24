import {
  Alert,
  Card,
  Descriptions,
  Empty,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { FrontDeskReport } from '@/services/ReportService';
import {
  APPOINTMENT_STATUSES,
  formatAverageWait,
  formatReportDate,
  formatReportMoney,
  formatReportNumber,
  hasPeriodActivity,
  PAYMENT_LABELS,
  PERIOD_LABELS,
} from './helpers';
import { Help, MetricGrid, SectionGrid, StatusList } from './styles';

interface Props {
  report: FrontDeskReport;
}
export default function PeriodOverview({ report }: Props) {
  const stats = report.periodStats;
  const invoices = stats.invoices;
  const cages = stats.cageOccupancy;
  const zoneRows = [
    { key: 'all', label: 'Toàn phòng khám', ...cages },
    { key: 'holding', label: 'Khu chờ', ...cages.byZone.Holding },
    {
      key: 'inpatient',
      label: 'Khu nội trú',
      ...cages.byZone.InpatientWard,
    },
    {
      key: 'isolated',
      label: 'Trong đó: chuồng cách ly',
      ...cages.isolatedCages,
      occupancyRate: undefined,
    },
  ];
  return (
    <>
      <section aria-labelledby="front-desk-period-title">
        <Space wrap>
          <Typography.Title
            id="front-desk-period-title"
            level={3}
            style={{ margin: 0 }}
          >
            Thống kê theo kỳ
          </Typography.Title>
          <Tag>{PERIOD_LABELS[report.period]}</Tag>
        </Space>
        <Help>
          Khoảng ngày áp dụng từ máy chủ:{' '}
          <Typography.Text strong>
            {formatReportDate(report.from)} – {formatReportDate(report.to)}
          </Typography.Text>{' '}
          (UTC+7, tính cả hai ngày).
        </Help>
        {!hasPeriodActivity(stats) && (
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            message="Chưa có lịch hẹn hoặc hóa đơn trong kỳ này."
            description="Số liệu chuồng vẫn phản ánh tình hình hiện tại, không phải dữ liệu trong kỳ."
          />
        )}
        <MetricGrid>
          <Card size="small">
            <Statistic
              title="Tổng lịch hẹn trong kỳ"
              value={stats.totalAppointments}
              formatter={value => formatReportNumber(Number(value))}
            />
            <Help>Theo ngày hẹn, bao gồm mọi trạng thái.</Help>
          </Card>
          <Card size="small">
            <Statistic
              title="Đặt trực tuyến"
              value={stats.onlineCount}
              formatter={value => formatReportNumber(Number(value))}
            />
            <Help>Kênh Online trong kỳ.</Help>
          </Card>
          <Card size="small">
            <Statistic
              title="Tiếp nhận tại quầy"
              value={stats.walkInCount}
              formatter={value => formatReportNumber(Number(value))}
            />
            <Help>Kênh Walk-in trong kỳ.</Help>
          </Card>
          <Card size="small">
            <Statistic
              title="Thời gian chờ trung bình"
              value={formatAverageWait(stats.averageWaitMinutes)}
            />
            <Help>
              {formatReportNumber(stats.waitTimeSampleCount)} lịch có mẫu hợp
              lệ: từ lúc tiếp nhận đến lần bắt đầu dịch vụ đầu tiên. Không tính
              thời gian đang chờ chưa bắt đầu.
            </Help>
          </Card>
        </MetricGrid>
      </section>
      <SectionGrid>
        <Card title="Lịch hẹn theo trạng thái">
          <Help style={{ marginTop: 0, marginBottom: 16 }}>
            Trạng thái hiện tại của lịch có ngày hẹn trong khoảng{' '}
            {formatReportDate(report.from)} – {formatReportDate(report.to)}.
          </Help>
          <StatusList>
            {APPOINTMENT_STATUSES.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{formatReportNumber(stats.appointmentsByStatus[key])}</dd>
              </div>
            ))}
          </StatusList>
        </Card>
        <Card title="Hóa đơn và tiền đã thu">
          <Descriptions
            column={1}
            size="small"
            items={[
              {
                key: 'issued',
                label: 'Hóa đơn lập trong kỳ',
                children: (
                  <Typography.Text strong>
                    {formatReportNumber(invoices.issuedCount)}
                  </Typography.Text>
                ),
              },
              {
                key: 'unpaid',
                label: 'Chưa thanh toán · lập trong kỳ',
                children: formatReportNumber(invoices.unpaidCount),
              },
              {
                key: 'paid',
                label: 'Hóa đơn thanh toán trong kỳ',
                children: formatReportNumber(invoices.paidCount),
              },
              {
                key: 'collected',
                label: 'Tổng tiền đã thu trong kỳ',
                children: (
                  <Typography.Text strong>
                    {formatReportMoney(invoices.totalCollected)}
                  </Typography.Text>
                ),
              },
            ]}
          />
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            message="Hai mốc thời gian khác nhau"
            description="Số hóa đơn lập và số chưa thanh toán tính theo ngày lập hóa đơn. Số đã thanh toán và tiền đã thu tính theo ngày thanh toán, có thể gồm hóa đơn lập trước kỳ. Không dùng hai số này để tính tỷ lệ thanh toán."
          />
        </Card>
      </SectionGrid>
      <Card title="Tiền đã thu theo phương thức thanh toán">
        <Help style={{ marginTop: 0, marginBottom: 16 }}>
          Chỉ hóa đơn đã thanh toán, theo ngày thanh toán trong kỳ. Không phải
          số hóa đơn lập trong kỳ.
        </Help>
        <Table
          rowKey="paymentMethod"
          dataSource={invoices.byPaymentMethod}
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có khoản thu theo phương thức thanh toán."
              />
            ),
          }}
          columns={[
            {
              title: 'Phương thức',
              dataIndex: 'paymentMethod',
              render: (method: string) => PAYMENT_LABELS[method] || method,
            },
            {
              title: 'Hóa đơn đã thanh toán',
              dataIndex: 'invoiceCount',
              align: 'right',
              render: formatReportNumber,
            },
            {
              title: 'Tiền đã thu',
              dataIndex: 'revenue',
              align: 'right',
              render: formatReportMoney,
            },
          ]}
        />
      </Card>
      <Card title="Phân bổ chuồng · ảnh chụp hiện tại">
        <Help style={{ marginTop: 0, marginBottom: 16 }}>
          Số liệu hiện tại, không phải mức sử dụng trung bình trong kỳ. Chuồng
          cách ly là tập con trong các khu, không cộng thêm vào tổng chuồng.
        </Help>
        <Table
          rowKey="key"
          dataSource={zoneRows}
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          columns={[
            { title: 'Khu vực', dataIndex: 'label' },
            {
              title: 'Tổng chuồng',
              dataIndex: 'total',
              align: 'right',
              render: formatReportNumber,
            },
            {
              title: 'Đang sử dụng',
              dataIndex: 'occupied',
              align: 'right',
              render: formatReportNumber,
            },
            {
              title: 'Còn trống',
              dataIndex: 'available',
              align: 'right',
              render: formatReportNumber,
            },
            {
              title: 'Tỷ lệ sử dụng',
              dataIndex: 'occupancyRate',
              align: 'right',
              render: (value?: number) =>
                value === undefined ? '—' : `${formatReportNumber(value)}%`,
            },
          ]}
        />
      </Card>
    </>
  );
}
