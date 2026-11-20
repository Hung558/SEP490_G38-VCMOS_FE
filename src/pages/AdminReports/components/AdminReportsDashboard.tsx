import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import ReportService from '@/services/ReportService';
import type {
  FrontDeskReport,
  OperationsReport,
  ReportFilters,
  RevenueReport,
} from '@/services/ReportService';
import { validateReportFilters } from '@/services/ReportService';
import BestSellingCard from './BestSellingCard';
import { FilterRow } from './styles';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
type Kind = 'day' | 'week' | 'month' | 'custom';
const money = (n?: number | null) => `${(n ?? 0).toLocaleString('vi-VN')} ₫`;
const pct = (n?: number | null) =>
  `${(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
const dateLabel = (from: string, to: string) =>
  from === to
    ? dayjs(from).format('DD/MM/YYYY')
    : `${dayjs(from).format('DD/MM/YYYY')} – ${dayjs(to).format('DD/MM/YYYY')}`;
const statusLabels: Record<string, string> = {
  Booked: 'Đã đặt',
  CheckedIn: 'Đã đến',
  InProgress: 'Đang khám',
  WaitOwner: 'Chờ chủ đón',
  Done: 'Hoàn tất',
  Overdue: 'Quá hạn',
  Cancelled: 'Đã hủy',
};
const categoryLabels: Record<string, string> = {
  Examination: 'Khám',
  Vaccination: 'Tiêm chủng',
  Grooming: 'Spa',
  Paraclinical: 'Cận lâm sàng',
  Inpatient: 'Nội trú',
};

const AdminReportsDashboard = () => {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || user?.systemRole);
  const isAdmin = role === 'Admin';
  const [kind, setKind] = useState<Kind>('month');
  const [dates, setDates] = useState<[string, string] | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [revenue, setRevenue] = useState<RevenueReport>();
  const [operations, setOperations] = useState<OperationsReport>();
  const [frontDesk, setFrontDesk] = useState<FrontDeskReport>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo<ReportFilters>(
    () => ({
      period: kind,
      ...(kind === 'custom' && dates ? { from: dates[0], to: dates[1] } : {}),
    }),
    [kind, dates]
  );
  const validationError = validateReportFilters(filters);
  useEffect(() => {
    if (!isAdmin || validationError) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRevenue(undefined);
    setOperations(undefined);
    setFrontDesk(undefined);
    Promise.all([
      ReportService.getRevenue(filters, controller.signal),
      ReportService.getOperations(filters, controller.signal),
      ReportService.getFrontDesk(filters, controller.signal),
    ])
      .then(([r, o, f]) => {
        setRevenue(r);
        setOperations(o);
        setFrontDesk(f);
      })
      .catch(err => {
        if (!axios.isCancel(err) && !controller.signal.aborted)
          setError(
            err?.response?.data?.message ||
              'Không tải được báo cáo. Vui lòng thử lại.'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, isAdmin, validationError, refresh, user?._id, role]);

  const reload = useCallback(() => setRefresh(n => n + 1), []);
  const shownRange = revenue
    ? dateLabel(revenue.from, revenue.to)
    : operations
      ? dateLabel(operations.from, operations.to)
      : '';
  const revenueMax = Math.max(
    1,
    ...(revenue?.revenueSeries.map(x => x.revenue) ?? [])
  );
  if (!isAdmin)
    return (
      <Alert
        type="error"
        showIcon
        message="Bạn không có quyền xem báo cáo quản trị."
      />
    );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <FilterRow>
            <Segmented<Kind>
              value={kind}
              onChange={value => {
                setKind(value);
                if (value !== 'custom') setDates(undefined);
              }}
              options={[
                { value: 'day', label: 'Hôm nay' },
                { value: 'week', label: 'Tuần này' },
                { value: 'month', label: 'Tháng này' },
                { value: 'custom', label: 'Tùy chọn' },
              ]}
              aria-label="Kỳ báo cáo"
            />
            <RangePicker
              value={
                dates?.map(x => dayjs(x)) as
                  | [dayjs.Dayjs, dayjs.Dayjs]
                  | undefined
              }
              format="DD/MM/YYYY"
              allowClear
              onChange={range => {
                if (range?.[0] && range[1]) {
                  setDates([
                    range[0].format('YYYY-MM-DD'),
                    range[1].format('YYYY-MM-DD'),
                  ]);
                  setKind('custom');
                } else setDates(undefined);
              }}
              disabledDate={(d, info) =>
                d.isAfter(dayjs(), 'day') ||
                Boolean(info.from && Math.abs(d.diff(info.from, 'day')) > 365)
              }
              aria-label="Khoảng ngày báo cáo"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={reload}
              loading={loading}
            >
              Làm mới
            </Button>
          </FilterRow>
          {validationError && (
            <Alert type="warning" showIcon message={validationError} />
          )}
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              action={
                <Button size="small" onClick={reload}>
                  Thử lại
                </Button>
              }
            />
          )}
          {shownRange && (
            <Text type="secondary">
              Kỳ báo cáo theo dữ liệu máy chủ: {shownRange}. Số liệu tổng quan
              và tình trạng chuồng là ảnh chụp hiện tại.
            </Text>
          )}
        </Space>
      </Card>

      <Card title="Doanh thu">
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic
              title="Doanh thu đã thu"
              value={revenue?.kpis.totalRevenue ?? 0}
              formatter={v => money(Number(v))}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Hóa đơn đã thanh toán"
              value={revenue?.kpis.paidInvoiceCount ?? 0}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Giá trị hóa đơn TB"
              value={revenue?.kpis.averageInvoiceValue ?? 0}
              formatter={v => money(Number(v))}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="So với kỳ trước"
              value={revenue?.kpis.revenueChangePercent ?? undefined}
              precision={1}
              suffix={revenue?.kpis.revenueChangePercent == null ? '—' : '%'}
              valueStyle={{
                color:
                  (revenue?.kpis.revenueChangePercent ?? 0) >= 0
                    ? '#389e0d'
                    : '#cf1322',
              }}
              loading={loading}
            />
          </Col>
        </Row>
        {revenue && (
          <Text type="secondary">
            Kỳ trước (
            {dateLabel(
              revenue.kpis.previousPeriod.from,
              revenue.kpis.previousPeriod.to
            )}
            ): {money(revenue.kpis.previousPeriod.totalRevenue)} ·{' '}
            {revenue.kpis.previousPeriod.paidInvoiceCount} hóa đơn. Chỉ tính hóa
            đơn đã thanh toán theo ngày thu.
          </Text>
        )}
        <Title level={5}>
          Diễn biến doanh thu (
          {revenue?.groupBy === 'month' ? 'theo tháng' : 'theo ngày'})
        </Title>
        {revenue?.revenueSeries.length ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {revenue.revenueSeries.map(x => (
              <Row
                key={x.period}
                align="middle"
                gutter={12}
                style={{ width: '100%' }}
              >
                <Col xs={6} md={3}>
                  <Text>{x.period}</Text>
                </Col>
                <Col xs={14} md={17}>
                  <Progress
                    percent={Math.round((x.revenue / revenueMax) * 100)}
                    showInfo={false}
                    strokeColor="#1677ff"
                  />
                </Col>
                <Col xs={4} md={4} style={{ textAlign: 'right' }}>
                  <Text strong>{money(x.revenue)}</Text>
                </Col>
              </Row>
            ))}
          </Space>
        ) : (
          !loading && <Empty description="Chưa có doanh thu trong kỳ" />
        )}
        <Row gutter={[16, 16]} style={{ marginTop: 18 }}>
          <Col xs={24} md={8}>
            <Title level={5}>Theo phương thức thanh toán</Title>
            {revenue?.byPaymentMethod.map(x => (
              <div key={x.paymentMethod}>
                <Text>
                  {x.paymentMethod}: {money(x.revenue)} · {x.invoiceCount} HĐ (
                  {pct(x.percentage)})
                </Text>
              </div>
            ))}
          </Col>
          <Col xs={24} md={8}>
            <Title level={5}>Theo nhóm dịch vụ</Title>
            {revenue?.byServiceCategory.map(x => (
              <div key={x.category}>
                <Text>
                  {categoryLabels[x.category] || x.category}: {money(x.revenue)}{' '}
                  · {x.itemCount} lượt ({pct(x.percentage)})
                </Text>
              </div>
            ))}
          </Col>
          <Col xs={24} md={8}>
            <Title level={5}>Theo loại hạng mục</Title>
            {revenue?.byItemType.map(x => (
              <div key={x.type}>
                <Text>
                  {x.type}: {money(x.revenue)} · {x.itemCount} mục (
                  {pct(x.percentage)})
                </Text>
              </div>
            ))}
          </Col>
        </Row>
      </Card>

      <Card title="Hoạt động & lịch hẹn">
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic
              title="Tổng lịch hẹn"
              value={operations?.appointments.total ?? 0}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Hoàn tất"
              value={operations?.appointments.completionRate ?? 0}
              suffix="%"
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Quá hạn"
              value={operations?.appointments.overdueRate ?? 0}
              suffix="%"
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Đã hủy"
              value={operations?.appointments.cancellationRate ?? 0}
              suffix="%"
              loading={loading}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Title level={5}>Trạng thái lịch hẹn trong kỳ</Title>
            {operations &&
              Object.entries(operations.appointments.byStatus).map(([s, n]) => (
                <Tag key={s} style={{ marginBottom: 8 }}>
                  {statusLabels[s] || s}: {n}
                </Tag>
              ))}
            <div>
              <Text>
                Online: {operations?.appointments.byChannel.online ?? 0} (
                {pct(operations?.appointments.byChannel.onlineRate)}) · Walk-in:{' '}
                {operations?.appointments.byChannel.walkIn ?? 0} (
                {pct(operations?.appointments.byChannel.walkInRate)})
              </Text>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Title level={5}>Dịch vụ theo nhóm trong kỳ</Title>
            {operations?.servicesByCategory.map(x => (
              <div key={x.category}>
                <Text>
                  {categoryLabels[x.category] || x.category}: {x.totalCount}{' '}
                  lượt, hoàn tất {x.doneCount}
                </Text>
              </div>
            ))}
          </Col>
        </Row>
        <Title level={5}>Dịch vụ được sử dụng nhiều</Title>
        <Table
          size="small"
          rowKey="serviceId"
          pagination={false}
          loading={loading}
          dataSource={operations?.topServices ?? []}
          columns={[
            { title: 'Hạng', dataIndex: 'rank', width: 70 },
            { title: 'Dịch vụ', dataIndex: 'name' },
            { title: 'Mã', dataIndex: 'code', render: v => v || '—' },
            {
              title: 'Nhóm',
              dataIndex: 'category',
              render: v => categoryLabels[v] || v || '—',
            },
            { title: 'Lượt', dataIndex: 'count' },
            { title: 'Hoàn tất', dataIndex: 'doneCount' },
          ]}
          locale={{ emptyText: 'Chưa có lượt sử dụng dịch vụ trong kỳ' }}
          scroll={{ x: 600 }}
        />
        <Title level={5}>Tình trạng chuồng hiện tại</Title>
        <Row gutter={[16, 8]}>
          {['Holding', 'InpatientWard'].map(zone => {
            const z =
              operations?.cageOccupancy.byZone[
                zone as 'Holding' | 'InpatientWard'
              ];
            return (
              <Col xs={24} md={8} key={zone}>
                <Text>
                  {zone === 'Holding' ? 'Khu lưu giữ' : 'Khu nội trú'}:{' '}
                  {z?.occupied ?? 0}/{z?.total ?? 0} · trống {z?.available ?? 0}{' '}
                  ({pct(z?.occupancyRate)})
                </Text>
              </Col>
            );
          })}
          <Col xs={24} md={8}>
            <Text>
              Toàn bộ: {operations?.cageOccupancy.occupied ?? 0}/
              {operations?.cageOccupancy.total ?? 0} · trống{' '}
              {operations?.cageOccupancy.available ?? 0} (
              {pct(operations?.cageOccupancy.occupancyRate)})
            </Text>
          </Col>
          <Col xs={24}>
            <Text>
              Chuồng cách ly:{' '}
              {operations?.cageOccupancy.isolatedCages.occupied ?? 0}/
              {operations?.cageOccupancy.isolatedCages.total ?? 0} đang dùng
            </Text>
          </Col>
        </Row>
        <Title level={5}>Tổng quan danh mục hiện tại</Title>
        <Row gutter={16}>
          {[
            ['Khách hàng hoạt động', operations?.overview.activeCustomersCount],
            ['Thú cưng hoạt động', operations?.overview.activePetsCount],
            ['Sản phẩm hoạt động', operations?.overview.activeProductsCount],
            [
              'Sản phẩm ngừng hoạt động',
              operations?.overview.inactiveProductsCount,
            ],
          ].map(([label, value]) => (
            <Col xs={12} md={6} key={String(label)}>
              <Statistic
                title={String(label)}
                value={Number(value ?? 0)}
                loading={loading}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="Quầy lễ tân">
        <Text type="secondary">
          Ảnh chụp trực tiếp hôm nay:{' '}
          {frontDesk ? dateLabel(frontDesk.today, frontDesk.today) : '—'}
        </Text>
        <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
          {[
            ['Lịch hẹn dự kiến', frontDesk?.todayCounters.expectedToday],
            ['Đã check-in', frontDesk?.todayCounters.checkedInNow],
            ['Đang khám', frontDesk?.todayCounters.inProgressNow],
            ['Chờ đón', frontDesk?.todayCounters.waitingForPickup],
          ].map(([label, value]) => (
            <Col xs={12} md={6} key={String(label)}>
              <Statistic
                title={String(label)}
                value={Number(value ?? 0)}
                loading={loading}
              />
            </Col>
          ))}
        </Row>
        <Text type="secondary">
          Chuồng tại quầy hiện tại:{' '}
          {frontDesk?.todayCounters.cages.occupied ?? 0}/
          {frontDesk?.todayCounters.cages.total ?? 0} đang dùng · còn trống{' '}
          {frontDesk?.todayCounters.cages.available ?? 0} · lấp đầy{' '}
          {pct(frontDesk?.todayCounters.cages.occupancyRate)}
        </Text>
        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          <Col xs={12} md={6}>
            <Statistic
              title="Thời gian chờ TB trong kỳ"
              value={frontDesk?.periodStats.averageWaitMinutes ?? undefined}
              suffix={
                frontDesk?.periodStats.averageWaitMinutes == null ? '' : 'phút'
              }
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Mẫu tính thời gian chờ"
              value={frontDesk?.periodStats.waitTimeSampleCount ?? 0}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Thu trong kỳ"
              value={frontDesk?.periodStats.invoices.totalCollected ?? 0}
              formatter={v => money(Number(v))}
              loading={loading}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Hóa đơn đã lập"
              value={frontDesk?.periodStats.invoices.issuedCount ?? 0}
              loading={loading}
            />
          </Col>
        </Row>
        <Row gutter={[16, 12]} style={{ marginTop: 14 }}>
          <Col xs={24} md={12}>
            <Title level={5}>Lịch hẹn trong kỳ</Title>
            {frontDesk &&
              Object.entries(frontDesk.periodStats.appointmentsByStatus).map(
                ([s, n]) => (
                  <Tag key={s} style={{ marginBottom: 8 }}>
                    {statusLabels[s] || s}: {n}
                  </Tag>
                )
              )}
            <Text>
              Online {frontDesk?.periodStats.onlineCount ?? 0} · Walk-in{' '}
              {frontDesk?.periodStats.walkInCount ?? 0} · Tổng{' '}
              {frontDesk?.periodStats.totalAppointments ?? 0}
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <Title level={5}>Hóa đơn trong kỳ</Title>
            <Text>
              Đã thanh toán {frontDesk?.periodStats.invoices.paidCount ?? 0} ·
              Chưa thanh toán {frontDesk?.periodStats.invoices.unpaidCount ?? 0}
            </Text>
            {frontDesk?.periodStats.invoices.byPaymentMethod.map(x => (
              <div key={x.paymentMethod}>
                <Text>
                  {x.paymentMethod}: {money(x.revenue)} · {x.invoiceCount} HĐ
                </Text>
              </div>
            ))}
          </Col>
        </Row>
        <Title level={5}>Ảnh chụp chuồng theo báo cáo quầy</Title>
        <Text type="secondary">
          Toàn bộ: {frontDesk?.periodStats.cageOccupancy.occupied ?? 0}/
          {frontDesk?.periodStats.cageOccupancy.total ?? 0} đang dùng · còn
          trống {frontDesk?.periodStats.cageOccupancy.available ?? 0} · lấp đầy{' '}
          {pct(frontDesk?.periodStats.cageOccupancy.occupancyRate)}. Khu lưu
          giữ:{' '}
          {frontDesk?.periodStats.cageOccupancy.byZone.Holding.occupied ?? 0}/
          {frontDesk?.periodStats.cageOccupancy.byZone.Holding.total ?? 0} (
          {pct(
            frontDesk?.periodStats.cageOccupancy.byZone.Holding.occupancyRate
          )}
          ); khu nội trú:{' '}
          {frontDesk?.periodStats.cageOccupancy.byZone.InpatientWard.occupied ??
            0}
          /
          {frontDesk?.periodStats.cageOccupancy.byZone.InpatientWard.total ?? 0}{' '}
          (
          {pct(
            frontDesk?.periodStats.cageOccupancy.byZone.InpatientWard
              .occupancyRate
          )}
          ); cách ly:{' '}
          {frontDesk?.periodStats.cageOccupancy.isolatedCages.occupied ?? 0}/
          {frontDesk?.periodStats.cageOccupancy.isolatedCages.total ?? 0} đang
          dùng, còn trống{' '}
          {frontDesk?.periodStats.cageOccupancy.isolatedCages.available ?? 0}.
        </Text>
      </Card>
      <BestSellingCard />
    </Space>
  );
};
export default AdminReportsDashboard;
