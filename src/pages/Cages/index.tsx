import { useState } from 'react';
import type { Cage } from '@/services/CageService';
import { Button, Card, Segmented, Space, Typography } from 'antd';
import {
  AppstoreOutlined,
  HistoryOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { PageWrapper } from './components/styles';
import { useCageManagement } from './components/useCageManagement';
import CageFilters from './components/CageFilters';
import CageTable from './components/CageTable';
import CageDetailModal from './components/CageDetailModal';
import CageFormModal from './components/CageFormModal';
import CageBoard from './components/CageBoard';
import CageBoardActionModal from './components/CageBoardActionModal';
import { useCageBoard } from './components/useCageBoard';
import CageAssignmentHistory from './components/CageAssignmentHistory';

type CageView = 'board' | 'history' | 'list';

/**
 * One page for everything about cages. Clinic staff work on the board (SCR-19) and
 * look back in the assignment history; Admin keeps the cage catalogue (CRUD) and a
 * read-only board (Admin cannot read assignments).
 */
const VIEW_OPTIONS = {
  staff: [
    { value: 'board', label: 'Sơ đồ', icon: <AppstoreOutlined /> },
    {
      value: 'history',
      label: 'Lịch sử phân chuồng',
      icon: <HistoryOutlined />,
    },
  ],
  admin: [
    {
      value: 'list',
      label: 'Danh sách chuồng',
      icon: <UnorderedListOutlined />,
    },
    { value: 'board', label: 'Sơ đồ', icon: <AppstoreOutlined /> },
  ],
};

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

const CagesPage = () => {
  const state = useCageManagement({ pageSize: PAGE_SIZE });
  const [view, setView] = useState<CageView>(() =>
    state.isAdmin ? 'list' : 'board'
  );
  // Available cage being filled from the board ("Xếp thú cưng")
  const [assigningCage, setAssigningCage] = useState<Cage | null>(null);
  const board = useCageBoard({
    active: view === 'board',
    // GET /cage-assignments is open to clinic staff only (Admin gets 403)
    canSeeOccupants: !state.isAdmin,
    isReceptionist: state.isReceptionist,
  });

  return (
    <PageWrapper>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space
            style={{ justifyContent: 'space-between', width: '100%' }}
            wrap
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {state.isAdmin ? 'Quản lý chuồng' : 'Sơ đồ chuồng'}
              </Title>
              <Text type="secondary">
                {state.isAdmin
                  ? 'Thêm, sửa chuồng và xem nhanh chuồng nào đang trống'
                  : 'Chuồng trống, thú cưng đang ở trong chuồng; xếp và giải phóng chuồng'}
              </Text>
            </div>
            <Segmented
              aria-label="Kiểu hiển thị"
              value={view}
              onChange={value => setView(value as CageView)}
              options={state.isAdmin ? VIEW_OPTIONS.admin : VIEW_OPTIONS.staff}
            />
          </Space>

          {view === 'board' ? (
            <CageBoard
              cages={board.cages}
              assignmentsByCage={board.assignmentsByCage}
              occupants={board.occupants}
              cageHistory={board.cageHistory}
              loaded={board.loaded}
              error={board.error}
              lastUpdated={board.lastUpdated}
              mutating={board.mutating}
              canSeeOccupants={!state.isAdmin}
              canManage={state.isReceptionist}
              onRefresh={() => void board.refresh()}
              onAssign={setAssigningCage}
              onRelease={(cage, assignment) =>
                void board.releasePet(cage, assignment)
              }
            />
          ) : view === 'history' ? (
            <CageAssignmentHistory cages={board.cages} />
          ) : (
            <>
              <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                {state.isAdmin && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={state.openCreateForm}
                  >
                    Thêm chuồng
                  </Button>
                )}
              </Space>

              <CageFilters
                status={state.status}
                size={state.size}
                isIsolated={state.isIsolated}
                sort={state.sort}
                loading={state.loading}
                hasFilters={state.hasFilters}
                onStatusChange={state.handleFilterStatus}
                onSizeChange={state.handleFilterSize}
                onIsolationChange={state.handleFilterIsolated}
                onSortChange={state.handleSort}
                onReset={state.resetFilters}
                onRefresh={state.retryList}
              />

              <CageTable
                cages={state.cages}
                loading={state.loading}
                error={state.listError}
                hasFilters={state.hasFilters}
                page={state.page}
                pageSize={PAGE_SIZE}
                total={state.total}
                isAdmin={state.isAdmin}
                onPageChange={state.setPage}
                onRetry={state.retryList}
                onResetFilters={state.resetFilters}
                onDetail={state.openDetail}
                onEdit={state.openEditForm}
              />
            </>
          )}
        </Space>
      </Card>

      {state.isReceptionist && (
        <CageBoardActionModal
          cage={assigningCage}
          submitting={board.mutating}
          loadOrdersWithoutCage={board.loadOrdersWithoutCage}
          loadPetWeight={board.loadPetWeight}
          onAssign={board.assignPet}
          onClose={() => setAssigningCage(null)}
        />
      )}

      <CageDetailModal
        open={state.detailOpen}
        loading={state.detailLoading}
        error={state.detailError}
        cage={state.detailCage}
        onClose={state.closeDetail}
      />

      {state.isAdmin && (
        <CageFormModal
          open={state.formOpen}
          mode={state.formMode}
          editingCage={state.editingCage}
          saving={state.saving}
          fieldErrors={state.formFieldErrors}
          generalError={state.formGeneralError}
          onCancel={state.closeForm}
          onSubmit={state.submitForm}
        />
      )}
    </PageWrapper>
  );
};

export default CagesPage;
