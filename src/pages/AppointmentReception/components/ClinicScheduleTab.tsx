import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Popover,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  BuildOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  HomeOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { CageAssignment, StaffAppointment } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import {
  getAppointmentServiceName,
  getAppointmentServiceStaffName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
} from '@/services/AppointmentServiceService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import {
  SCHEDULE_DAY_END,
  SCHEDULE_DAY_START,
  SCHEDULE_STATUS_STYLES,
  SCHEDULE_STEP,
  type ScheduleBlock,
  buildScheduleEntries,
  buildScheduleRows,
  formatMinutes,
} from './clinicScheduleHelpers';
import { useClinicSchedule } from './useClinicSchedule';

const { Text } = Typography;

const COL = 26; // px per 15 minutes
const LANE = 46; // px per stacked block
const LABEL_W = 210;
const COLUMNS = (SCHEDULE_DAY_END - SCHEDULE_DAY_START) / SCHEDULE_STEP;
const HOURS = Array.from(
  { length: (SCHEDULE_DAY_END - SCHEDULE_DAY_START) / 60 },
  (_, i) => SCHEDULE_DAY_START / 60 + i
);
const AT_CLINIC = ['CheckedIn', 'InProgress', 'WaitOwner'];

const Scroller = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const GridTable = styled.div`
  width: ${LABEL_W + COLUMNS * COL}px;

  .row {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
  }
  .row:last-child {
    border-bottom: none;
  }
  .label {
    position: sticky;
    left: 0;
    z-index: 2;
    flex: 0 0 ${LABEL_W}px;
    padding: 8px 10px;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-width: 0;
  }
  .head .label,
  .head .hours {
    background: #f8fafc;
    font-weight: 600;
  }
  .hours {
    display: flex;
  }
  .hour {
    flex: 0 0 ${COL * 4}px;
    padding: 6px 4px;
    border-left: 1px solid #e2e8f0;
    font-size: 12px;
  }
  .track {
    position: relative;
    flex: 0 0 ${COLUMNS * COL}px;
    /* quarter-hour lines, darker on the hour */
    background-image:
      repeating-linear-gradient(
        to right,
        #e2e8f0 0 1px,
        transparent 1px ${COL * 4}px
      ),
      repeating-linear-gradient(
        to right,
        #f1f5f9 0 1px,
        transparent 1px ${COL}px
      );
  }
`;

const Block = styled.button<{ $color: string; $bg: string }>`
  position: absolute;
  height: ${LANE - 8}px;
  padding: 2px 6px;
  border: 1px solid ${p => p.$color};
  border-left: 4px solid ${p => p.$color};
  border-radius: 6px;
  background: ${p => p.$bg};
  color: #0f172a;
  text-align: left;
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #1677ff;
    outline-offset: 1px;
  }
  .line {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;

  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    margin-right: 4px;
    vertical-align: -2px;
  }
`;

interface ClinicScheduleTabProps {
  active: boolean;
  revision: number;
  isReceptionist: boolean;
  activeCageByOrderId: ReadonlyMap<string, CageAssignment>;
  onCheckIn: (order: StaffAppointment) => void;
  onViewDetail: (order: StaffAppointment) => void;
  onCancel: (order: StaffAppointment) => void;
  onAssignCage: (order: StaffAppointment) => void;
  onViewCage: (assignment: CageAssignment) => void;
}

/** SCR-17: who works on which pet and when, for one day */
const ClinicScheduleTab = ({
  active,
  revision,
  isReceptionist,
  activeCageByOrderId,
  onCheckIn,
  onViewDetail,
  onCancel,
  onAssignCage,
  onViewCage,
}: ClinicScheduleTabProps) => {
  const schedule = useClinicSchedule({ active, revision });
  const [showCancelled, setShowCancelled] = useState(false);
  const [openBlock, setOpenBlock] = useState<string>();

  const { entries, unscheduled } = useMemo(
    () => buildScheduleEntries(schedule.orders, schedule.servicesByOrder),
    [schedule.orders, schedule.servicesByOrder]
  );
  const rows = useMemo(
    () => buildScheduleRows(schedule.staff, entries, { showCancelled }),
    [schedule.staff, entries, showCancelled]
  );
  const visibleUnscheduled = unscheduled.filter(
    o => showCancelled || o.derivedStatus !== 'Cancelled'
  );

  const act = (fn: () => void) => () => {
    setOpenBlock(undefined);
    fn();
  };

  const renderPopover = (block: ScheduleBlock) => {
    const { order } = block;
    const services = [...(schedule.servicesByOrder.get(order._id) || [])].sort(
      (a, b) => a.sequenceNo - b.sequenceNo
    );
    const cage = activeCageByOrderId.get(order._id);
    const phone = getAppointmentOwnerPhone(order.ownerId);
    return (
      <Space direction="vertical" size={6} style={{ maxWidth: 340 }}>
        <Space size={6} wrap>
          <Text strong style={{ color: '#0958d9' }}>
            {order.code}
          </Text>
          <Tag color={getAppointmentStatusColor(order.derivedStatus)}>
            {getAppointmentStatusLabel(order.derivedStatus)}
          </Tag>
          <Tag color={order.isOnline ? 'blue' : 'purple'}>
            {order.isOnline ? 'Online' : 'Tại chỗ'}
          </Tag>
        </Space>
        <Text>
          Khách: {getAppointmentOwnerName(order.ownerId)}
          {phone !== '-' ? ` · ${phone}` : ''}
        </Text>
        <Text>Thú cưng: {getAppointmentPetName(order.petId)}</Text>
        <div>
          <Text type="secondary">Dịch vụ theo thứ tự:</Text>
          <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {services.map(s => (
              <li key={s._id}>
                {getAppointmentServiceName(s.serviceId)}
                {s.scheduledStart
                  ? ` (${s.scheduledStart}–${s.scheduledEnd || '?'})`
                  : ''}{' '}
                · {getAppointmentServiceStaffName(s.assignedStaffId)}{' '}
                <Tag color={getAppointmentServiceStatusColor(s.status)}>
                  {getAppointmentServiceStatusLabel(s.status)}
                </Tag>
              </li>
            ))}
          </ol>
        </div>
        {order.note && <Text type="secondary">Ghi chú: {order.note}</Text>}
        <Text type="secondary">
          Chuồng: {cage ? getAssignmentCageLabel(cage.cageId) : 'Chưa có'}
        </Text>
        <Space size={6} wrap>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={act(() => onViewDetail(order))}
          >
            {isReceptionist ? 'Chi tiết, đổi người' : 'Chi tiết'}
          </Button>
          {isReceptionist && order.derivedStatus === 'Booked' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={act(() => onCheckIn(order))}
            >
              Check-in
            </Button>
          )}
          {isReceptionist &&
            AT_CLINIC.includes(order.derivedStatus) &&
            !cage && (
              <Button
                size="small"
                icon={<BuildOutlined />}
                onClick={act(() => onAssignCage(order))}
              >
                Phân chuồng
              </Button>
            )}
          {isReceptionist && cage && (
            <Button
              size="small"
              icon={<HomeOutlined />}
              onClick={act(() => onViewCage(cage))}
            >
              Xem chuồng
            </Button>
          )}
          {isReceptionist && order.derivedStatus === 'Booked' && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={act(() => onCancel(order))}
            >
              Hủy lịch
            </Button>
          )}
        </Space>
      </Space>
    );
  };

  const isToday = schedule.date === getVietnamTodayString();

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space wrap>
          <DatePicker
            aria-label="Ngày xem lịch"
            allowClear={false}
            format="DD/MM/YYYY"
            value={dayjs(schedule.date)}
            onChange={d => d && schedule.setDate(d.format('YYYY-MM-DD'))}
          />
          <Button
            disabled={isToday}
            onClick={() => schedule.setDate(getVietnamTodayString())}
          >
            Hôm nay
          </Button>
          <Checkbox
            checked={showCancelled}
            onChange={e => setShowCancelled(e.target.checked)}
          >
            Hiện dịch vụ đã hủy
          </Checkbox>
        </Space>
        <Space wrap>
          <Text type="secondary">
            {schedule.orders.length} lịch hẹn · {entries.length} dịch vụ có giờ
          </Text>
          <Button
            icon={<ReloadOutlined />}
            loading={schedule.loading}
            onClick={schedule.reload}
          >
            Làm mới
          </Button>
        </Space>
      </Space>

      {!schedule.shiftKnown && (
        <Alert
          type="info"
          showIcon
          message="Chưa có ca làm việc nào được xếp cho ngày này"
          description="Đang hiện mọi Bác sĩ và Groomer đang hoạt động. Khi có màn phân ca (SCR-30), lịch chỉ hiện người có ca."
        />
      )}
      {schedule.error && (
        <Alert
          type="error"
          showIcon
          message={schedule.error}
          action={
            <Button size="small" onClick={schedule.reload}>
              Thử lại
            </Button>
          }
        />
      )}

      <Legend aria-label="Chú thích màu">
        {Object.values(SCHEDULE_STATUS_STYLES)
          .filter(s => showCancelled || s.status !== 'Cancelled')
          .map(s => (
            <span key={s.status}>
              <span
                className="swatch"
                style={{
                  background: s.background,
                  border: `1px solid ${s.color}`,
                }}
              />
              {s.label}
            </span>
          ))}
      </Legend>

      <Spin spinning={schedule.loading && schedule.orders.length > 0}>
        {schedule.loading &&
        schedule.orders.length === 0 &&
        rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : rows.length === 0 ? (
          <Empty description="Không có nhân viên hay lịch hẹn nào trong ngày" />
        ) : (
          <Scroller>
            <GridTable
              role="table"
              aria-label={`Lịch chung ngày ${dayjs(schedule.date).format('DD/MM/YYYY')}`}
            >
              <div className="row head" role="row">
                <div className="label" role="columnheader">
                  Nhân viên
                </div>
                <div className="hours">
                  {HOURS.map(h => (
                    <div className="hour" key={h} role="columnheader">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>
              {rows.map(row => (
                <div className="row" role="row" key={row.key}>
                  <div className="label" role="rowheader">
                    <Text strong ellipsis>
                      {row.name}
                    </Text>
                    <Space size={4} wrap>
                      {row.role && (
                        <Tag
                          color={
                            row.role === 'Groomer' ? 'magenta' : 'geekblue'
                          }
                          style={{ marginInlineEnd: 0 }}
                        >
                          {row.role === 'Groomer' ? 'Groomer' : 'Bác sĩ'}
                        </Tag>
                      )}
                      {!row.onShift && (
                        <Tag style={{ marginInlineEnd: 0 }}>Không có ca</Tag>
                      )}
                      {row.blocks.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Trống
                        </Text>
                      )}
                    </Space>
                  </div>
                  <div className="track" style={{ height: row.lanes * LANE }}>
                    {row.blocks.map(block => {
                      const style =
                        SCHEDULE_STATUS_STYLES[block.service.status];
                      const time = `${formatMinutes(block.start)}–${formatMinutes(block.end)}`;
                      const label = `${getAppointmentPetName(block.order.petId)} · ${getAppointmentServiceName(block.service.serviceId)}`;
                      return (
                        <Popover
                          key={block.key}
                          trigger="click"
                          open={openBlock === block.key}
                          onOpenChange={open =>
                            setOpenBlock(open ? block.key : undefined)
                          }
                          title={`${time} · ${style.label}`}
                          content={renderPopover(block)}
                        >
                          <Block
                            type="button"
                            $color={style.color}
                            $bg={style.background}
                            aria-label={`${time}, ${label}, ${style.label}`}
                            style={{
                              left: block.column * COL + 1,
                              width: block.span * COL - 3,
                              top: block.lane * LANE + 4,
                            }}
                          >
                            <span className="line" style={{ fontWeight: 600 }}>
                              {time}
                            </span>
                            <span className="line">{label}</span>
                          </Block>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              ))}
            </GridTable>
          </Scroller>
        )}
      </Spin>

      {visibleUnscheduled.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${visibleUnscheduled.length} lịch hẹn chưa có giờ hẹn nên không đặt lên lưới`}
          description={
            <Space size={[8, 4]} wrap>
              {visibleUnscheduled.map(o => (
                <Button
                  key={o._id}
                  size="small"
                  onClick={() => onViewDetail(o)}
                >
                  {o.code} · {getAppointmentPetName(o.petId)}
                </Button>
              ))}
            </Space>
          }
        />
      )}
    </Space>
  );
};

export default ClinicScheduleTab;
