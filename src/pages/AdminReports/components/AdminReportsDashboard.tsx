import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Segmented,
  Skeleton,
  Tabs,
} from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  ReloadOutlined,
  ShopOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
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
import { InfoTip, RangeChip, Stack } from '@/components/dashboard';
import BestSellingCard from './BestSellingCard';
import FrontDeskTab from './FrontDeskTab';
import OperationsTab from './OperationsTab';
import RevenueTab from './RevenueTab';
import { dateLabel } from './labels';
import { FilterCard, TabsBar } from './styles';

const ReportPlaceholder = ({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) =>
  loading ? (
    <Skeleton active paragraph={{ rows: 8 }} />
  ) : error ? (
    <Alert
      type="error"
      showIcon
      message={error}
      action={
        <Button size="small" onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  ) : (
    <Empty description="Chưa có báo cáo để hiển thị" />
  );
type ReportName = 'revenue' | 'operations' | 'frontDesk';
type TabKey = ReportName | 'bestSelling';
type ReportState<T> = { key: string; data: T };
const { RangePicker } = DatePicker;
type Kind = 'day' | 'week' | 'month' | 'custom';
const isValidDateInput = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const AuthorizedAdminReportsDashboard = () => {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || user?.systemRole);
  const isAdmin = role === 'Admin';
  const [tab, setTab] = useState<TabKey>('revenue');
  const [kind, setKind] = useState<Kind>('month');
  const [dates, setDates] = useState<[string, string] | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [revenueState, setRevenueState] =
    useState<ReportState<RevenueReport>>();
  const [operationsState, setOperationsState] =
    useState<ReportState<OperationsReport>>();
  const [frontDeskState, setFrontDeskState] =
    useState<ReportState<FrontDeskReport>>();
  const [loading, setLoading] = useState<Record<ReportName, boolean>>({
    revenue: false,
    operations: false,
    frontDesk: false,
  });
  const [errors, setErrors] = useState<Partial<Record<ReportName, string>>>({});
  const identity = `${user?._id || user?.email || ''}:${role}`;

  const filters = useMemo<ReportFilters>(
    () => ({
      period: kind,
      ...(kind === 'custom' && dates ? { from: dates[0], to: dates[1] } : {}),
    }),
    [kind, dates]
  );
  const validationError = validateReportFilters(filters);
  // Grouping by month only means something for a custom range over several
  // months: today, this week and this month are always shown day by day (24/11)
  const spansMonths =
    kind === 'custom' &&
    !!dates &&
    !validationError &&
    dates[0].slice(0, 7) !== dates[1].slice(0, 7);
  const effectiveGroupBy = spansMonths ? groupBy : 'day';
  const requestKey = `${identity}:${JSON.stringify(filters)}:${refresh}`;
  const revenueKey = `${requestKey}:${effectiveGroupBy}`;
  const revenue =
    revenueState?.key === revenueKey && !loading.revenue
      ? revenueState.data
      : undefined;
  const operations =
    operationsState?.key === requestKey && !loading.operations
      ? operationsState.data
      : undefined;
  const frontDesk =
    frontDeskState?.key === requestKey && !loading.frontDesk
      ? frontDeskState.data
      : undefined;

  useEffect(() => {
    if (!isAdmin || validationError) {
      setLoading({ revenue: false, operations: false, frontDesk: false });
      return;
    }
    const controller = new AbortController();
    setLoading({ revenue: true, operations: true, frontDesk: true });
    setRevenueState(undefined);
    setOperationsState(undefined);
    setFrontDeskState(undefined);
    setErrors({});
    const load = <T,>(
      name: ReportName,
      request: Promise<T>,
      save: (value: ReportState<T>) => void,
      key: string
    ) => {
      request
        .then(data => {
          if (!controller.signal.aborted) save({ key, data });
        })
        .catch(error => {
          if (!axios.isCancel(error) && !controller.signal.aborted)
            setErrors(current => ({
              ...current,
              [name]:
                error?.response?.data?.message ||
                'Không tải được báo cáo. Vui lòng thử lại.',
            }));
        })
        .finally(() => {
          if (!controller.signal.aborted)
            setLoading(current => ({ ...current, [name]: false }));
        });
    };
    load(
      'revenue',
      ReportService.getRevenue(
        { ...filters, groupBy: effectiveGroupBy },
        controller.signal
      ),
      setRevenueState,
      revenueKey
    );
    load(
      'operations',
      ReportService.getOperations(filters, controller.signal),
      setOperationsState,
      requestKey
    );
    load(
      'frontDesk',
      ReportService.getFrontDesk(filters, controller.signal),
      setFrontDeskState,
      requestKey
    );
    return () => controller.abort();
  }, [
    requestKey,
    revenueKey,
    isAdmin,
    validationError,
    refresh,
    identity,
    filters,
    effectiveGroupBy,
  ]);

  const reload = useCallback(() => setRefresh(n => n + 1), []);
  const shownRange = revenue
    ? dateLabel(revenue.from, revenue.to)
    : operations
      ? dateLabel(operations.from, operations.to)
      : frontDesk
        ? dateLabel(frontDesk.from, frontDesk.to)
        : '';
  if (!isAdmin)
    return (
      <Alert
        type="error"
        showIcon
        message="Bạn không có quyền xem báo cáo quản trị."
      />
    );

  const placeholder = (name: ReportName) => (
    <ReportPlaceholder
      loading={loading[name]}
      error={errors[name]}
      onRetry={reload}
    />
  );

  return (
    <Stack $gap={16}>
      <TabsBar>
        <Tabs
          activeKey={tab}
          onChange={key => setTab(key as TabKey)}
          items={[
            {
              key: 'revenue',
              label: 'Doanh thu',
              icon: <DollarOutlined />,
            },
            {
              key: 'operations',
              label: 'Hoạt động & lịch hẹn',
              icon: <CalendarOutlined />,
            },
            {
              key: 'frontDesk',
              label: 'Quầy lễ tân',
              icon: <ShopOutlined />,
            },
            {
              key: 'bestSelling',
              label: 'Sản phẩm bán chạy',
              icon: <TrophyOutlined />,
            },
          ]}
        />
      </TabsBar>

      {/* The product report keeps its own period (paid invoices up to today) */}
      {tab !== 'bestSelling' && (
        <FilterCard>
          <div className="filters">
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
              onChange={(range, dateStrings) => {
                if (
                  range?.[0]?.isValid() &&
                  range[1]?.isValid() &&
                  dateStrings.every(isValidDateInput)
                ) {
                  setDates([
                    range[0].format('YYYY-MM-DD'),
                    range[1].format('YYYY-MM-DD'),
                  ]);
                  setKind('custom');
                } else if (dateStrings.some(Boolean)) {
                  setKind('custom');
                  setDates(['invalid-date', 'invalid-date']);
                } else {
                  setDates(undefined);
                }
              }}
              disabledDate={(d, info) =>
                Boolean(info.from && Math.abs(d.diff(info.from, 'day')) > 365)
              }
              placeholder={['Từ ngày', 'Đến ngày']}
              aria-label="Khoảng ngày báo cáo"
            />
            {tab === 'revenue' && spansMonths && (
              <span className="group-by">
                <span className="label">Nhóm theo</span>
                <Segmented<'day' | 'month'>
                  value={groupBy}
                  onChange={setGroupBy}
                  options={[
                    { value: 'day', label: 'Ngày' },
                    { value: 'month', label: 'Tháng' },
                  ]}
                  aria-label="Nhóm doanh thu theo"
                />
              </span>
            )}
            <Button
              className="reload"
              icon={<ReloadOutlined />}
              onClick={reload}
              loading={loading.revenue}
            >
              Làm mới
            </Button>
          </div>
          {validationError && (
            <Alert type="warning" showIcon message={validationError} />
          )}
          {shownRange && (
            <div className="range">
              <RangeChip>Kỳ báo cáo: {shownRange}</RangeChip>
              <InfoTip text="Kỳ báo cáo theo dữ liệu máy chủ, múi giờ UTC+7. Tổng quan danh mục và tình trạng chuồng là ảnh chụp hiện tại, không phải dữ liệu lịch sử." />
            </div>
          )}
        </FilterCard>
      )}

      {tab === 'revenue' &&
        (revenue ? <RevenueTab revenue={revenue} /> : placeholder('revenue'))}
      {tab === 'operations' &&
        (operations ? (
          <OperationsTab operations={operations} />
        ) : (
          placeholder('operations')
        ))}
      {tab === 'frontDesk' &&
        (frontDesk ? (
          <FrontDeskTab frontDesk={frontDesk} />
        ) : (
          placeholder('frontDesk')
        ))}
      {/* Mounted always, so its own filters survive a tab switch */}
      <div hidden={tab !== 'bestSelling'}>
        <BestSellingCard key={identity} />
      </div>
    </Stack>
  );
};
// Remount the whole report subtree (including the existing product report) when
// the authenticated identity changes. Never mount data-fetching widgets for other roles.
const AdminReportsDashboard = () => {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || user?.systemRole);
  if (!user || role !== 'Admin')
    return (
      <Alert
        type="error"
        showIcon
        message="Bạn không có quyền xem báo cáo quản trị."
      />
    );
  return (
    <AuthorizedAdminReportsDashboard
      key={JSON.stringify([user._id, user.email, role])}
    />
  );
};
export default AdminReportsDashboard;
