import { Alert, Button, Card, Tabs, Typography } from 'antd';
import {
  ScheduleOutlined,
  BuildOutlined,
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
import CageAssignmentTable from './components/CageAssignmentTable';
import CageAssignmentModal from './components/CageAssignmentModal';
import CageAssignmentDetailModal from './components/CageAssignmentDetailModal';
import CustomerLookupPanel from './components/CustomerLookupPanel';
import WalkInModal from './components/WalkInModal';
import ReceptionTodayOverview from './components/ReceptionTodayOverview';

const { Title, Text } = Typography;

const AppointmentReceptionPage = () => {
  const state = useAppointmentReception();

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
    ...(state.isReceptionist
      ? [
          {
            key: 'assignments',
            label: (
              <span>
                <BuildOutlined />
                Phân công chuồng
              </span>
            ),
            children: (
              <CageAssignmentTable
                assignments={state.assignments}
                loading={state.assignmentLoading}
                error={state.assignmentError}
                activeFilter={state.assignmentActiveFilter}
                cageIdFilter={state.assignmentCageIdFilter}
                orderIdFilter={state.assignmentOrderIdFilter}
                onActiveFilterChange={state.handleAssignmentActiveFilter}
                onCageIdFilterChange={state.handleAssignmentCageIdFilter}
                onOrderIdFilterChange={state.handleAssignmentOrderIdFilter}
                onResetFilters={state.resetAssignmentFilters}
                onRefresh={state.fetchAssignments}
                onOpenCreateModal={() => state.openCreateAssignment()}
                onViewDetail={state.openAssignmentDetail}
              />
            ),
          },
        ]
      : []),
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
              Theo dõi, tiếp nhận khách hàng (check-in), khách vãng lai, phân
              công nhân sự và chuồng lưu trú cho thú cưng
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
            state.setActiveTab(key as 'appointments' | 'assignments' | 'lookup')
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
