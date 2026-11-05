import { Alert, Button, Card, Tabs, Typography } from 'antd';
import { ScheduleOutlined, BuildOutlined } from '@ant-design/icons';
import { PageWrapper } from './components/styles';
import { useAppointmentReception } from './components/useAppointmentReception';
import AppointmentFilters from './components/AppointmentFilters';
import AppointmentTable from './components/AppointmentTable';
import AppointmentDetailModal from './components/AppointmentDetailModal';
import CheckInConfirmModal from './components/CheckInConfirmModal';
import CageAssignmentTable from './components/CageAssignmentTable';
import CageAssignmentModal from './components/CageAssignmentModal';
import CageAssignmentDetailModal from './components/CageAssignmentDetailModal';

const { Title, Text } = Typography;

const AppointmentReceptionPage = () => {
  const state = useAppointmentReception();

  const appointmentContent = (
    <>
      <AppointmentFilters
        status={state.filterStatus}
        isOnline={state.filterIsOnline}
        code={state.filterCode}
        from={state.filterFrom}
        to={state.filterTo}
        loading={state.loading}
        hasFilters={state.hasFilters}
        onStatusChange={state.handleFilterStatus}
        onIsOnlineChange={state.handleFilterIsOnline}
        onCodeChange={state.handleFilterCode}
        onDateRangeChange={state.handleFilterDateRange}
        onReset={state.resetFilters}
        onRefresh={state.fetchAppointments}
      />

      {state.listError && (
        <Alert
          type="error"
          showIcon
          message={state.listError}
          action={
            <Button size="small" onClick={state.fetchAppointments}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <AppointmentTable
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
      />
    </>
  );

  return (
    <PageWrapper>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>
            Tiếp nhận lịch hẹn phòng khám
          </Title>
          <Text type="secondary">
            Theo dõi, tiếp nhận khách hàng (check-in) và phân công chuồng lưu
            trú cho thú cưng
          </Text>
        </div>

        {state.isReceptionist ? (
          <Tabs
            activeKey={state.activeTab}
            onChange={key =>
              state.setActiveTab(key as 'appointments' | 'assignments')
            }
            items={[
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
            ]}
          />
        ) : (
          appointmentContent
        )}

        {/* Modals */}
        <AppointmentDetailModal
          open={state.detailOpen}
          appointment={state.selectedAppointment}
          onClose={state.closeDetail}
        />

        {state.isReceptionist && (
          <>
            <CheckInConfirmModal
              open={state.checkInOpen}
              appointment={state.checkInTarget}
              submitting={state.checkInSubmitting}
              onConfirm={state.confirmCheckIn}
              onClose={state.closeCheckIn}
            />

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
