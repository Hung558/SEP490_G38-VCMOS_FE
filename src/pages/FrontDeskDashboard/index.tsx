import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton, Typography } from 'antd';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  BuildOutlined,
  DollarOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import ROUTER from '@/routerMap/ROUTER';
import ReportService, {
  type FrontDeskReport,
  type ReportFilters,
} from '@/services/ReportService';
import {
  DashSection,
  PageHeader,
  RangeChip,
  VisuallyHidden,
} from '@/components/dashboard';
import FrontDeskFilters from './components/FrontDeskFilters';
import CageOverview from './components/CageOverview';
import PeriodOverview from './components/PeriodOverview';
import {
  formatReportDate,
  frontDeskIdentityKey,
  isFrontDeskRole,
  PERIOD_LABELS,
  readFrontDeskError,
} from './components/helpers';
import { ActionGrid, ActionTile, Page, TopGrid } from './components/styles';

function AuthorizedFrontDesk({ role }: { role: string }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilters>({ period: 'day' });
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    requestKey?: string;
    report?: FrontDeskReport;
    error?: string;
    loading: boolean;
    receivedAt?: Date;
  }>({ loading: true });
  const requestKey = JSON.stringify([filters, revision]);
  const display = state.requestKey === requestKey ? state : { loading: true };
  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    // Clear old values on every fetch: an error never appears as valid zero data.
    setState({ requestKey, loading: true });
    ReportService.getFrontDesk(filters, abort.signal)
      .then(report => {
        if (active && !abort.signal.aborted)
          setState({
            requestKey,
            report,
            loading: false,
            receivedAt: new Date(),
          });
      })
      .catch((failure: unknown) => {
        if (active && !abort.signal.aborted)
          setState({
            requestKey,
            error: readFrontDeskError(failure),
            loading: false,
          });
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [filters, revision, requestKey]);

  const report = !display.loading ? display.report : undefined;
  const actions = [
    {
      key: 'reception',
      label: 'Mở tiếp nhận lịch hẹn',
      icon: <ScheduleOutlined />,
      to: ROUTER.CLINIC_APPOINTMENTS,
      primary: true,
    },
    ...(role === 'Receptionist'
      ? [
          {
            key: 'walkin',
            label: 'Tiếp nhận khách tại quầy',
            icon: <UserAddOutlined />,
            to: `${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`,
          },
        ]
      : []),
    {
      key: 'invoices',
      label:
        role === 'Receptionist'
          ? 'Thu ngân và chờ đón'
          : 'Xem hóa đơn và chờ đón',
      icon: <DollarOutlined />,
      to: ROUTER.CLINIC_INVOICES,
    },
    {
      key: 'cages',
      label: 'Xem và bố trí chuồng',
      icon: <BuildOutlined />,
      to: ROUTER.CAGES,
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Tổng quan quầy lễ tân"
        extra={
          <>
            {display.receivedAt && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Tải lúc{' '}
                {new Intl.DateTimeFormat('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  timeStyle: 'medium',
                }).format(display.receivedAt)}{' '}
                (UTC+7)
              </Typography.Text>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={refresh}
              loading={display.loading}
            >
              Làm mới số liệu
            </Button>
          </>
        }
      />

      <TopGrid>
        <DashSection
          title="Đi đến công việc"
          icon={<ThunderboltOutlined />}
          info="Các lối tắt mở màn hình nghiệp vụ, không tự áp bộ lọc. Khi tra cứu lịch đã tiếp nhận hoặc chờ đón từ ngày trước, hãy chọn ngày phù hợp tại màn hình đích."
        >
          <ActionGrid>
            {actions.map(action => (
              <ActionTile
                key={action.key}
                type="button"
                $primary={action.primary}
                onClick={() => navigate(action.to)}
              >
                <span className="icon" aria-hidden>
                  {action.icon}
                </span>
                {action.label}
                <ArrowRightOutlined className="arrow" aria-hidden />
              </ActionTile>
            ))}
          </ActionGrid>
        </DashSection>
        <CageOverview report={report} loading={display.loading} />
      </TopGrid>

      <DashSection
        title="Thống kê theo kỳ"
        icon={<BarChartOutlined />}
        info="Ngày tính theo múi giờ Việt Nam (UTC+7), bao gồm cả ngày đầu và ngày cuối; tối đa 366 ngày. Số liệu chuồng hiện tại không thay đổi theo bộ lọc kỳ."
        extra={
          report && (
            <RangeChip>
              {PERIOD_LABELS[report.period]} · {formatReportDate(report.from)}
              {report.from !== report.to && ` – ${formatReportDate(report.to)}`}
            </RangeChip>
          )
        }
      >
        <FrontDeskFilters
          loading={display.loading}
          onApply={next => {
            setFilters(next);
            refresh();
          }}
        />
        {display.loading && (
          <div aria-busy="true">
            <VisuallyHidden role="status">
              Đang tải thống kê quầy lễ tân…
            </VisuallyHidden>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        )}
        {display.error && (
          <Alert
            type="error"
            showIcon
            message="Chưa tải được số liệu"
            description={<span role="alert">{display.error}</span>}
            action={<Button onClick={refresh}>Thử lại</Button>}
          />
        )}
        {report && <PeriodOverview report={report} />}
      </DashSection>
    </Page>
  );
}

export default function FrontDeskDashboardPage() {
  const { user } = useAuth();
  const role = user?.role || user?.systemRole;
  if (!user || !isFrontDeskRole(role))
    return (
      <Page>
        <Alert
          type="warning"
          showIcon
          message="Tổng quan quầy lễ tân chỉ dành cho Lễ tân và Quản trị viên đã đăng nhập."
        />
      </Page>
    );
  return <AuthorizedFrontDesk key={frontDeskIdentityKey(user)} role={role} />;
}
