import {
  Alert,
  Avatar,
  Button,
  Empty,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { Cage } from '@/services/CageService';
import {
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';
import type { CageAssignment } from '@/types';
import {
  CAGE_BOARD_REFRESH_MS,
  formatTimeInCage,
  getAssignmentOrder,
  sortCagesForBoard,
  summarizeCages,
} from './cageBoardHelpers';
import type { CageOccupant } from './useCageBoard';

const { Text } = Typography;

// "Đang dùng" in the theme teal (ThemeConfigAntd colorPrimary #0d9488)
const OCCUPIED_TAG = {
  marginInlineEnd: 0,
  color: '#0f766e',
  backgroundColor: '#f0fdfa',
  borderColor: '#99f6e4',
};

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
`;

const Card = styled.section<{ $occupied: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  /* Web theme (ThemeConfigAntd): an occupied cage carries the teal primary on top,
     a free one is a light dashed slot waiting for a pet */
  border: 1px ${p => (p.$occupied ? 'solid #e2e8f0' : 'dashed #94a3b8')};
  border-top: ${p =>
    p.$occupied ? '3px solid #0d9488' : '1px dashed #94a3b8'};
  background: ${p => (p.$occupied ? '#ffffff' : '#f8fafc')};
  min-height: 150px;

  .cage-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .cage-label {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
  }

  .occupant {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    min-width: 0;
  }

  .occupant-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 13px;
  }

  .no-pet {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: #475569;
  }

  .cage-actions {
    margin-top: auto;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

interface CageBoardProps {
  cages: Cage[];
  assignmentsByCage: Map<string, CageAssignment>;
  occupants: Map<string, CageOccupant>;
  /** Latest assignment of an Occupied cage without an open one (null = never) */
  cageHistory: Map<string, CageAssignment | null>;
  loaded: boolean;
  error: string | null;
  lastUpdated: Date | null;
  mutating: boolean;
  canSeeOccupants: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onAssign: (cage: Cage) => void;
  onRelease: (cage: Cage, assignment: CageAssignment) => void;
}

const CageBoard = ({
  cages,
  assignmentsByCage,
  occupants,
  cageHistory,
  loaded,
  error,
  lastUpdated,
  mutating,
  canSeeOccupants,
  canManage,
  onRefresh,
  onAssign,
  onRelease,
}: CageBoardProps) => {
  const visible = sortCagesForBoard(cages);
  const summary = summarizeCages(visible);
  const now = Date.now();

  const renderOccupant = (assignment: CageAssignment) => {
    const { id, order } = getAssignmentOrder(assignment);
    const occupant = id ? occupants.get(id) : undefined;
    const placed = formatTimeInCage(assignment.assignedAt, now);
    return (
      <div className="occupant">
        <Avatar
          src={occupant?.photoUrl || undefined}
          size={40}
          style={{
            backgroundColor: '#ccfbf1',
            color: '#0f766e',
            flexShrink: 0,
          }}
        >
          {(occupant?.petName || '?').charAt(0).toUpperCase()}
        </Avatar>
        <div className="occupant-lines">
          <Text strong ellipsis>
            {occupant?.petName || 'Đang tải thú cưng…'}
          </Text>
          {occupant?.ownerName && (
            <Text type="secondary" ellipsis>
              Chủ: {occupant.ownerName}
              {occupant.ownerPhone ? ` · ${occupant.ownerPhone}` : ''}
            </Text>
          )}
          {order && (
            <Space size={4} wrap>
              <Text style={{ color: '#0f766e', fontWeight: 600 }}>
                {order.code}
              </Text>
              <Tag
                color={getAppointmentStatusColor(order.derivedStatus)}
                style={{ marginInlineEnd: 0 }}
              >
                {getAppointmentStatusLabel(order.derivedStatus)}
              </Tag>
            </Space>
          )}
          {assignment.assignedAt && (
            <Text type="secondary">
              Vào chuồng {dayjs(assignment.assignedAt).format('HH:mm DD/MM')}
              {placed ? ` · ${placed}` : ''}
            </Text>
          )}
        </div>
      </div>
    );
  };

  // Occupied in the cage record but no pet assigned: say what the data shows
  const renderNoPet = (cage: Cage) => {
    if (!canSeeOccupants) {
      return (
        <Text type="secondary" style={{ fontSize: 13 }}>
          Đang có thú cưng
        </Text>
      );
    }
    if (!cageHistory.has(cage._id)) {
      return (
        <Text type="secondary" style={{ fontSize: 13 }}>
          Đang kiểm tra lịch sử chuồng…
        </Text>
      );
    }
    const last = cageHistory.get(cage._id);
    const lastOrder = last ? getAssignmentOrder(last).order : undefined;
    return (
      <div className="no-pet">
        <Text strong style={{ color: '#0f172a' }}>
          Không có thú cưng trong chuồng
        </Text>
        <span>
          {last
            ? `Lượt gần nhất ${lastOrder?.code || ''} đã ra chuồng lúc ${last.releasedAt ? dayjs(last.releasedAt).format('HH:mm DD/MM') : '-'}, nhưng chuồng chưa được trả về Trống.`
            : `Chuồng chưa từng được xếp thú cưng; trạng thái "Đang dùng" được đặt trực tiếp lúc ${cage.updatedAt ? dayjs(cage.updatedAt).format('HH:mm DD/MM') : '-'}.`}
        </span>
        <span>Admin cần chuyển chuồng về Trống ở Quản lý chuồng.</span>
      </div>
    );
  };

  const renderActions = (cage: Cage, assignment?: CageAssignment) => {
    if (!canManage) return null;
    if (cage.status === 'Available') {
      return (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<PlusOutlined />}
          disabled={mutating}
          onClick={() => onAssign(cage)}
        >
          Xếp thú cưng
        </Button>
      );
    }
    if (!assignment) return null;
    // The BE has no move API (UC-30): to move, release here and place the pet again
    return (
      <>
        <Popconfirm
          title={`Giải phóng chuồng ${cage.label}?`}
          description="Thú cưng được đưa ra khỏi chuồng, chuồng trở lại trạng thái Trống."
          okText="Giải phóng"
          cancelText="Không"
          okButtonProps={{ danger: true }}
          onConfirm={() => onRelease(cage, assignment)}
        >
          <Button
            size="small"
            danger
            icon={<LogoutOutlined />}
            disabled={mutating}
          >
            Giải phóng
          </Button>
        </Popconfirm>
      </>
    );
  };

  return (
    <div>
      <Toolbar>
        <Space wrap size="middle">
          <Text>
            Trống <Text strong>{summary.available}</Text> / {summary.total}{' '}
            chuồng
          </Text>
        </Space>
        <Space wrap size="small">
          <Text type="secondary" role="status">
            Tự làm mới mỗi {CAGE_BOARD_REFRESH_MS / 1000} giây
            {lastUpdated
              ? ` · cập nhật ${dayjs(lastUpdated).format('HH:mm:ss')}`
              : ''}
          </Text>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Làm mới
          </Button>
        </Space>
      </Toolbar>

      {!canSeeOccupants && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Admin chỉ xem trạng thái chuồng. Thông tin thú cưng trong chuồng dành cho nhân viên phòng khám."
        />
      )}

      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được sơ đồ chuồng mới nhất"
          description={error}
          action={
            <Button size="small" onClick={onRefresh}>
              Thử lại
            </Button>
          }
        />
      )}

      {!loaded ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : visible.length === 0 ? (
        <Empty description="Phòng khám chưa có chuồng nào" />
      ) : (
        <Grid>
          {visible.map(cage => {
            const occupied = cage.status === 'Occupied';
            const assignment = assignmentsByCage.get(cage._id);
            return (
              <Card
                key={cage._id}
                $occupied={occupied}
                aria-label={`Chuồng ${cage.label}, ${occupied ? 'đang có thú cưng' : 'trống'}`}
              >
                <div className="cage-head">
                  <div>
                    <div className="cage-label">{cage.label}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Cỡ {cage.size}
                    </Text>
                  </div>
                  <Space size={4} wrap style={{ justifyContent: 'flex-end' }}>
                    {cage.isIsolated && <Tag color="error">Cách ly</Tag>}
                    {occupied ? (
                      <Tag key="occupied" style={OCCUPIED_TAG}>
                        Đang dùng
                      </Tag>
                    ) : (
                      <Tag
                        key="available"
                        color="success"
                        style={{ marginInlineEnd: 0 }}
                      >
                        Trống
                      </Tag>
                    )}
                  </Space>
                </div>

                {occupied &&
                  (assignment ? renderOccupant(assignment) : renderNoPet(cage))}

                <div className="cage-actions">
                  {renderActions(cage, assignment)}
                </div>
              </Card>
            );
          })}
        </Grid>
      )}
    </div>
  );
};

export default CageBoard;
