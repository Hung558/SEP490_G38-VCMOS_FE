import { useEffect, useState } from 'react';
import { Alert, Button, Card, Skeleton, Space, Typography } from 'antd';
import { ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/routerProvider/authContext';
import ROUTER from '@/routerMap/ROUTER';
import ReportService, {
  type FrontDeskReport,
  type ReportFilters,
} from '@/services/ReportService';
import FrontDeskFilters from './components/FrontDeskFilters';
import CageOverview from './components/CageOverview';
import PeriodOverview from './components/PeriodOverview';
import {
  frontDeskIdentityKey,
  isFrontDeskRole,
  readFrontDeskError,
} from './components/helpers';
import { Header, Help, Page } from './components/styles';

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

  return (
    <Page>
      <Header>
        <div>
          <Typography.Title level={2}>Tổng quan quầy lễ tân</Typography.Title>
          <Typography.Text type="secondary">
            Nắm tình hình tiếp nhận, chờ đón, chuồng và thu ngân trước khi xử lý
            công việc.
          </Typography.Text>
        </div>
        <Space direction="vertical" align="end">
          <Button
            icon={<ReloadOutlined />}
            onClick={refresh}
            loading={display.loading}
          >
            Làm mới số liệu
          </Button>
          {display.receivedAt && (
            <Typography.Text type="secondary">
              Tải lúc{' '}
              {new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                timeStyle: 'medium',
              }).format(display.receivedAt)}{' '}
              (UTC+7)
            </Typography.Text>
          )}
        </Space>
      </Header>
      <Card title="Đi đến công việc">
        <Space wrap size="middle">
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate(ROUTER.CLINIC_APPOINTMENTS)}
          >
            Mở tiếp nhận lịch hẹn
          </Button>
          {role === 'Receptionist' && (
            <Button
              onClick={() =>
                navigate(`${ROUTER.CLINIC_APPOINTMENTS}?walkin=new`)
              }
            >
              Tiếp nhận khách tại quầy
            </Button>
          )}
          <Button onClick={() => navigate(ROUTER.CLINIC_INVOICES)}>
            {role === 'Receptionist'
              ? 'Thu ngân và chờ đón'
              : 'Xem hóa đơn và chờ đón'}
          </Button>
          <Button onClick={() => navigate(ROUTER.CAGES)}>
            Xem và bố trí chuồng
          </Button>
        </Space>
        <Help>
          Các lối tắt mở màn hình nghiệp vụ, không tự áp bộ lọc. Khi tra cứu
          lịch đã tiếp nhận hoặc chờ đón từ ngày trước, hãy chọn ngày phù hợp
          tại màn hình đích.
        </Help>
      </Card>
      <FrontDeskFilters
        loading={display.loading}
        onApply={next => {
          setFilters(next);
          refresh();
        }}
      />
      {display.loading && (
        <Card aria-busy="true">
          <div role="status">
            <Typography.Text>Đang tải thống kê quầy lễ tân…</Typography.Text>
          </div>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
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
      {!display.loading && display.report && (
        <>
          <CageOverview report={display.report} />
          <PeriodOverview report={display.report} />
        </>
      )}
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
