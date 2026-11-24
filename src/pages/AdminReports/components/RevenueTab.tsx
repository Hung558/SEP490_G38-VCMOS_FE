import { Empty } from 'antd';
import {
  CalculatorOutlined,
  DollarOutlined,
  FileDoneOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { RevenueReport } from '@/services/ReportService';
import {
  BarList,
  ColumnChart,
  Delta,
  Panel,
  PanelGrid,
  PointTable,
  Stack,
  StatGrid,
  StatTile,
  useChartView,
} from '@/components/dashboard';
import {
  categoryLabels,
  count,
  dateLabel,
  formatSeriesPeriod,
  itemTypeLabels,
  money,
  paymentLabels,
  pct,
} from './labels';

export default function RevenueTab({ revenue }: { revenue: RevenueReport }) {
  const { kpis } = revenue;
  const { view, toggle } = useChartView();
  const byMonth = revenue.groupBy === 'month';
  const points = revenue.revenueSeries.map(point => {
    const { label, tick } = formatSeriesPeriod(point.period);
    return {
      key: point.period,
      label,
      tick,
      value: point.revenue,
      display: money(point.revenue),
      sub: `${count(point.invoiceCount)} hóa đơn`,
      subValue: count(point.invoiceCount),
    };
  });
  // The BE sends a bucket for every day; all zero means nothing to draw
  const hasRevenue = points.some(point => point.value > 0);
  const previous = `Kỳ trước (${dateLabel(
    kpis.previousPeriod.from,
    kpis.previousPeriod.to
  )}): ${money(kpis.previousPeriod.totalRevenue)} · ${count(
    kpis.previousPeriod.paidInvoiceCount
  )} hóa đơn`;

  return (
    <Stack $gap={20}>
      <StatGrid>
        <StatTile
          icon={<DollarOutlined />}
          label="Doanh thu đã thu"
          value={money(kpis.totalRevenue)}
          caption="Hóa đơn đã thanh toán, theo ngày thu"
        />
        <StatTile
          icon={<FileDoneOutlined />}
          tone="blue"
          label="Hóa đơn đã thanh toán"
          value={count(kpis.paidInvoiceCount)}
        />
        <StatTile
          icon={<CalculatorOutlined />}
          tone="violet"
          label="Giá trị hóa đơn TB"
          value={money(kpis.averageInvoiceValue)}
        />
        <StatTile
          icon={<RiseOutlined />}
          tone="amber"
          label="So với kỳ trước"
          value={
            kpis.revenueChangePercent == null ? (
              'Chưa có cơ sở so sánh'
            ) : (
              <Delta
                value={kpis.revenueChangePercent}
                text={formatted => formatted}
              />
            )
          }
          textValue={kpis.revenueChangePercent == null}
          caption={previous}
        />
      </StatGrid>

      <Panel
        title={`Diễn biến doanh thu (${byMonth ? 'theo tháng' : 'theo ngày'})`}
        info="Chỉ tính hóa đơn đã thanh toán theo ngày thu. Di chuột hoặc dùng phím Tab trên từng cột để xem số tiền và số hóa đơn."
        extra={hasRevenue ? toggle : undefined}
      >
        {!hasRevenue ? (
          <Empty description="Chưa có doanh thu trong kỳ" />
        ) : view === 'chart' ? (
          <ColumnChart
            points={points}
            ariaLabel={`Doanh thu ${byMonth ? 'theo tháng' : 'theo ngày'}`}
          />
        ) : (
          <PointTable
            points={points}
            periodTitle={byMonth ? 'Tháng' : 'Ngày'}
            valueTitle="Doanh thu"
            subTitle="Hóa đơn"
          />
        )}
      </Panel>

      <PanelGrid $min={280}>
        <Panel title="Theo phương thức thanh toán">
          <BarList
            whole={100}
            emptyText="Chưa có khoản thu trong kỳ."
            items={revenue.byPaymentMethod.map(item => ({
              key: item.paymentMethod,
              label: paymentLabels[item.paymentMethod] || item.paymentMethod,
              value: item.percentage,
              display: money(item.revenue),
              sub: `${count(item.invoiceCount)} HĐ · ${pct(item.percentage)}`,
            }))}
          />
        </Panel>
        <Panel
          title="Theo nhóm dịch vụ"
          info="Tỷ trọng trên tổng tiền hạng mục dịch vụ, không phải tổng doanh thu. Nhóm dịch vụ dùng phân loại hiện tại; dịch vụ thiếu phân loại có thể khiến các nhóm hiển thị cộng lại dưới 100%."
        >
          <BarList
            whole={100}
            emptyText="Chưa có dịch vụ được thu tiền trong kỳ."
            items={revenue.byServiceCategory.map(item => ({
              key: item.category,
              label: categoryLabels[item.category] || item.category,
              value: item.percentage,
              display: money(item.revenue),
              sub: `${count(item.itemCount)} lượt · ${pct(item.percentage)}`,
            }))}
          />
        </Panel>
        <Panel title="Theo loại hạng mục">
          <BarList
            whole={100}
            emptyText="Chưa có hạng mục được thu tiền trong kỳ."
            items={revenue.byItemType.map(item => ({
              key: item.type,
              label: itemTypeLabels[item.type] || item.type,
              value: item.percentage,
              display: money(item.revenue),
              sub: `${count(item.itemCount)} mục · ${pct(item.percentage)}`,
            }))}
          />
        </Panel>
      </PanelGrid>
    </Stack>
  );
}
