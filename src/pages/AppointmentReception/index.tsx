import { Alert, Button, Card, Tabs, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import {
  ScheduleOutlined,
  CalendarOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, PageWrapper } from './components/styles';
import { useAppointmentReception } from './components/useAppointmentReception';
import AppointmentFilters from './components/AppointmentFilters';
import AppointmentTable from './components/AppointmentTable';
import AppointmentDetailModal from './components/AppointmentDetailModal';
import CheckInConfirmModal from './components/CheckInConfirmModal';
import CancelReasonModal from '@/components/appointment/CancelReasonModal';
import CageAssignmentModal from './components/CageAssignmentModal';
import CageAssignmentDetailModal from './components/CageAssignmentDetailModal';
import CustomerLookupPanel from './components/CustomerLookupPanel';
import WalkInModal from './components/WalkInModal';
import ClinicScheduleTab from './components/ClinicScheduleTab';
import ReceptionTodayOverview from './components/ReceptionTodayOverview';

const { Title, Text } = Typography;

const AppointmentReceptionPage = () => {
  const state = useAppointmentReception();
  const navigate = useNavigate();

  const appointmentContent = (
    <>
      {state.isReceptionist && (
        <ReceptionTodayOverview
          date={state.today.date}
          counts={state.today.counts}
          error={state.today.error}
          selected={state.selectedTodayGroup}
          onSelect={state.selectTodayGroup}
          onRetry={state.today.refresh}
          cages={state.cageAvailability}
          onOpenCages={() => navigate(ROUTER.CAGES)}
        />
      )}
      <AppointmentFilters
        status={state.filterStatus}
        isOnline={state.filterIsOnline}
        code={state.filterCode}
        singleDate={state.isReceptionist}
        from={state.filterFrom}
        to={state.filterTo}
        loading={state.loading}
        hasFilters={state.hasFilters}
        onStatusChange={state.handleFilterStatus}
        onIsOnlineChange={state.handleFilterIsOnline}
        onCodeChange={state.handleFilterCode}
        onDateRangeChange={state.handleFilterDateRange}
        onReset={state.resetFilters}
        onRefresh={state.refreshAppointmentList}
      />

      {state.listError && (
        <Alert
          type="error"
          showIcon
          message={state.listError}
          action={
            <Button size="small" onClick={state.refreshAppointmentList}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {state.activeCageLoading && (
        <Text
          type="secondary"
          role="status"
          style={{ display: 'block', marginBottom: 8 }}
        >
          Đang tải trạng thái phân chuồng…
        </Text>
      )}
      {state.activeCageError && (
        <Alert
          type="warning"
          showIcon
          message="Chưa xác định trạng thái phân chuồng"
          description={state.activeCageError}
          action={
            <Button size="small" onClick={() => state.fetchActiveCages()}>
              Tải lại chuồng
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <AppointmentTable
        activeCageByOrderId={state.activeCageByOrderId}
        appointments={state.appointments}
        total={state.total}
        page={state.page}
        limit={state.limit}
        loading={state.loading}
        isReceptionist={state.isReceptionist}
        onPageChange={state.handlePageChange}
        onViewDetail={state.openDetail}
        onCheckIn={state.openCheckIn}
        onAssignCage={state.openCreateAssignment}
        onViewCage={state.openAssignmentDetail}
        onCancelAppointment={state.openCancel}
      />
    </>
  );

  const tabItems = [
    {
      key: 'appointments',
      label: (
        <span>
          <ScheduleOutlined />
          Danh sách lịch hẹn
        </span>
      ),
      children: appointmentContent,
    },
    {
      key: 'schedule',
      label: (
        <span>
          <CalendarOutlined />
          Lịch chung
        </span>
      ),
      children: (
        <ClinicScheduleTab
          active={state.activeTab === 'schedule'}
          revision={state.scheduleRevision}
          isReceptionist={state.isReceptionist}
          activeCageByOrderId={state.activeCageByOrderId}
          onCheckIn={state.openCheckIn}
          onViewDetail={state.openDetail}
          onCancel={state.openCancel}
          onAssignCage={state.openCreateAssignment}
          onViewCage={state.openAssignmentDetail}
        />
      ),
    },
    {
      key: 'lookup',
      label: (
        <span>
          <SearchOutlined />
          Tra cứu khách hàng
        </span>
      ),
      children: (
        <CustomerLookupPanel
          canCreateWalkIn={state.isReceptionist}
          onWalkIn={state.openWalkIn}
          onViewOrder={state.openDetail}
        />
      ),
    },
  ];

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Tiếp nhận lịch hẹn phòng khám
            </Title>
            <Text type="secondary">
              Tiếp nhận lịch hẹn và khách vãng lai, phân công nhân sự, xem lịch
              chung và tra cứu khách hàng. Xếp, chuyển, giải phóng chuồng ở Sơ
              đồ chuồng.
            </Text>
          </div>
          {state.isReceptionist && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => state.openWalkIn()}
            >
              Tiếp nhận khách vãng lai (Walk-in)
            </Button>
          )}
        </PageHeader>

        <Tabs
          activeKey={state.activeTab}
          onChange={key =>
            state.setActiveTab(key as 'appointments' | 'schedule' | 'lookup')
          }
          items={tabItems}
        />

        {/* Modals */}
        <AppointmentDetailModal
          open={state.detailOpen}
          appointment={state.selectedAppointment}
          canAssignStaff={state.isReceptionist}
          onClose={state.closeDetail}
          onUpdated={state.refreshAppointmentList}
          onCancelAppointment={state.openCancel}
          serviceRefreshTrigger={state.serviceRefreshTrigger}
        />

        {state.isReceptionist && (
          <>
            <WalkInModal
              open={state.walkInOpen}
              initialPhone={state.walkInPhone}
              onClose={state.closeWalkIn}
              onCreated={state.handleWalkInCreated}
              onSubmitFailed={state.refreshAppointmentList}
            />

            <CheckInConfirmModal
              open={state.checkInOpen}
              appointment={state.checkInTarget}
              submitting={state.checkInSubmitting}
              cageBlockedReason={state.checkInCageBlockedReason}
              onConfirm={state.confirmCheckIn}
              onClose={state.closeCheckIn}
            />

            {state.cancelTarget && (
              <CancelReasonModal
                open={state.cancelOpen}
                title="Lễ tân hủy lịch hẹn"
                warningText="Lịch hẹn và các dịch vụ chưa bắt đầu (Booked, Waiting) sẽ bị hủy. Thao tác không thể hoàn tác."
                targetDescription={
                  <div>
                    Mã lịch hẹn: <strong>{state.cancelTarget.code}</strong>{' '}
                    (Ngày {dayjs(state.cancelTarget.date).format('DD/MM/YYYY')}
                    {state.cancelTarget.slotStart
                      ? ` - ${state.cancelTarget.slotStart}`
                      : ''}
                    )
                  </div>
                }
                confirmLoading={state.cancelSubmitting}
                onCancel={state.closeCancel}
                onConfirm={state.confirmCancel}
              />
            )}

            <CageAssignmentModal
              open={state.createAssignmentOpen}
              targetAppointment={state.targetAppointmentForCage}
              submitting={state.createAssignmentSubmitting}
              onSubmit={state.handleCreateAssignment}
              onClose={state.closeCreateAssignment}
            />

            <CageAssignmentDetailModal
              open={state.assignmentDetailOpen}
              assignment={state.selectedAssignment}
              loading={state.assignmentDetailLoading}
              error={state.assignmentDetailError}
              onClose={state.closeAssignmentDetail}
            />
          </>
        )}
      </Card>
    </PageWrapper>
  );
};

export default AppointmentReceptionPage;
