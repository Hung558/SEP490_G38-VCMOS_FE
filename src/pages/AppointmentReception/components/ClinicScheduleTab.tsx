import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Popover,
  Segmented,
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
import type { CageAssignment, StaffAppointment, StaffShift } from '@/types';
import {
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
  getAppointmentStatusColor,
  getOrderStatusText,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import {
  getAppointmentServiceName,
  getAppointmentServiceStaffName,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getServiceRefCategory,
} from '@/services/AppointmentServiceService';
import { getAssignmentCageLabel } from '@/services/CageAssignmentService';
import { getShiftInfo } from '@/services/StaffScheduleService';
import {
  SCHEDULE_STATUS_STYLES,
  SCHEDULE_VIEWS,
  type PlacedBlock,
  type ScheduleBlock,
  type ScheduleViewKey,
  buildScheduleEntries,
  buildScheduleRows,
  formatMinutes,
  getScheduleView,
  hourTicksInView,
  indexBusyShifts,
  layoutBlocksInView,
  offBandsInView,
  shiftBandsInView,
} from './clinicScheduleHelpers';
import { useClinicSchedule } from './useClinicSchedule';

const { Text } = Typography;

const LANE = 46; // px per stacked block
const LABEL_W = 200;
const AT_CLINIC = ['CheckedIn', 'InProgress', 'WaitOwner'];

/** A light tint per shift, so the evening stands apart from the day */
const SHIFT_TINT: Record<
  StaffShift,
  { band: string; text: string; track: string }
> = {
  MORNING: { band: '#fefce8', text: '#854d0e', track: '#fffef6' },
  AFTERNOON: { band: '#f0f9ff', text: '#075985', track: '#fbfdff' },
  EVENING: { band: '#f5f3ff', text: '#5b21b6', track: '#f9f7ff' },
};

const hh = (minutes: number) => formatMinutes(minutes).slice(0, 2);

const Frame = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const GridTable = styled.div`
  /* Percent positions: the grid fits its box; it only scrolls below this width */
  min-width: 720px;

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
    z-index: 4;
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
  .head .label {
    background: #f8fafc;
    font-weight: 600;
  }
  .scale {
    flex: 1 1 auto;
    min-width: 0;
    background: #f8fafc;
  }
  .bands {
    position: relative;
    height: 30px;
    border-bottom: 1px solid #e2e8f0;
  }
  .band {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 6px;
    border: none;
    border-left: 2px solid #cbd5e1;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
  }
  .band.first {
    border-left: none;
  }
  button.band {
    cursor: pointer;
  }
  button.band:hover,
  button.band:focus-visible {
    text-decoration: underline;
  }
  .band .time {
    font-weight: 400;
    opacity: 0.8;
  }
  .hours {
    position: relative;
    height: 28px;
  }
  .hour {
    position: absolute;
    top: 0;
    bottom: 0;
    padding: 6px 4px;
    border-left: 1px solid #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
  }
  .track {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }
  .tint {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 2px solid #cbd5e1;
  }
  .tint.first {
    border-left: none;
  }
  .lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(to right, #e2e8f0 1px, transparent 1px);
  }
  .lines.fine {
    background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px);
  }
  .off {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    background: repeating-linear-gradient(
      135deg,
      rgba(148, 163, 184, 0.16) 0 6px,
      rgba(148, 163, 184, 0.3) 6px 8px
    );
    color: #475569;
    font-size: 12px;
    font-weight: 600;
  }
`;

const Block = styled.button<{ $color: string; $bg: string }>`
  position: absolute;
  z-index: 2;
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
  /* Narrow blocks drop the end time and the pet line (see @container below) */
  container-type: inline-size;

  &.cut-start {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  &.cut-end {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right-style: dashed;
  }
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
  @container (max-width: 80px) {
    .end {
      display: none;
    }
  }
  @container (max-width: 48px) {
    .pet {
      display: none;
    }
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

  // The whole day 08:00–21:00, or one shift for a closer look
  const [viewKey, setViewKey] = useState<ScheduleViewKey>('day');
  const view = getScheduleView(viewKey);
  const bands = useMemo(() => shiftBandsInView(view), [view]);
  const ticks = useMemo(() => hourTicksInView(view), [view]);
  const hours = (view.end - view.start) / 60;
  const offByStaff = useMemo(
    () => indexBusyShifts(schedule.busy),
    [schedule.busy]
  );
  const laidOut = useMemo(
    () =>
      rows.map(row => {
        const { blocks, lanes } = layoutBlocksInView(row.blocks, view);
        const offShifts = offByStaff.get(row.key);
        return {
          row,
          blocks,
          lanes,
          offShifts,
          offBands: offBandsInView(offShifts, view),
        };
      }),
    [rows, view, offByStaff]
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
            {getOrderStatusText(order)}
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
                  {getAppointmentServiceStatusLabel(
                    s.status,
                    getServiceRefCategory(s.serviceId)
                  )}
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
            {isReceptionist && order.derivedStatus !== 'Booked'
              ? 'Chi tiết, đổi người'
              : 'Chi tiết'}
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
          <Segmented
            aria-label="Khung giờ xem"
            value={viewKey}
            onChange={value => setViewKey(value as ScheduleViewKey)}
            options={SCHEDULE_VIEWS.map(v => ({
              value: v.key,
              label:
                v.key === 'day'
                  ? `${v.label} ${hh(v.start)}–${hh(v.end)}h`
                  : `${v.label} ${hh(v.start)}–${hh(v.end)}`,
            }))}
          />
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
          description="Đang hiện mọi bác sĩ và nhân viên spa đang hoạt động. Khi có màn phân ca, lịch chỉ hiện người có ca."
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
          <Frame>
            <GridTable
              role="table"
              aria-label={`Lịch chung ngày ${dayjs(schedule.date).format('DD/MM/YYYY')}`}
            >
              <div className="row head" role="row">
                <div className="label" role="columnheader">
                  Nhân viên
                </div>
                <div className="scale">
                  <div className="bands">
                    {bands.map((band, i) => {
                      const tint = SHIFT_TINT[band.key];
                      const style = {
                        left: `${band.leftPct}%`,
                        width: `${band.widthPct}%`,
                        background: tint.band,
                        color: tint.text,
                      };
                      const content = (
                        <>
                          {band.label}
                          <span className="time">{band.time}</span>
                        </>
                      );
                      // In the whole-day view a band opens that shift alone
                      return viewKey === 'day' ? (
                        <button
                          key={band.key}
                          type="button"
                          className={`band${i === 0 ? ' first' : ''}`}
                          style={style}
                          title={`Xem riêng ${band.label.toLowerCase()}`}
                          onClick={() => setViewKey(band.key)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={band.key}
                          className={`band${i === 0 ? ' first' : ''}`}
                          style={style}
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                  <div className="hours">
                    {ticks.map(tick => (
                      <div
                        className="hour"
                        key={tick.label}
                        role="columnheader"
                        style={{ left: `${tick.leftPct}%` }}
                      >
                        {tick.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {laidOut.map(({ row, blocks, lanes, offShifts, offBands }) => (
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
                          {row.role === 'Groomer' ? 'Nhân viên spa' : 'Bác sĩ'}
                        </Tag>
                      )}
                      {!row.onShift && (
                        <Tag style={{ marginInlineEnd: 0 }}>Không có ca</Tag>
                      )}
                      {offShifts && offShifts.length > 0 && (
                        <Tag style={{ marginInlineEnd: 0 }}>
                          Nghỉ{' '}
                          {offShifts
                            .map(s => getShiftInfo(s)?.label.toLowerCase())
                            .join(', ')}
                        </Tag>
                      )}
                      {blocks.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Trống
                        </Text>
                      )}
                    </Space>
                  </div>
                  <div className="track" style={{ minHeight: lanes * LANE }}>
                    {bands.map((band, i) => (
                      <div
                        key={band.key}
                        className={`tint${i === 0 ? ' first' : ''}`}
                        style={{
                          left: `${band.leftPct}%`,
                          width: `${band.widthPct}%`,
                          background: SHIFT_TINT[band.key].track,
                        }}
                      />
                    ))}
                    {viewKey !== 'day' && (
                      <div
                        className="lines fine"
                        style={{
                          backgroundSize: `calc(100% / ${hours * 4}) 100%`,
                        }}
                      />
                    )}
                    <div
                      className="lines"
                      style={{ backgroundSize: `calc(100% / ${hours}) 100%` }}
                    />
                    {offBands.map(band => (
                      <div
                        key={band.key}
                        className="off"
                        role="note"
                        aria-label={`${row.name} nghỉ ${band.label.toLowerCase()}`}
                        style={{
                          left: `${band.leftPct}%`,
                          width: `${band.widthPct}%`,
                        }}
                      >
                        Nghỉ
                      </div>
                    ))}
                    {blocks.map((block: PlacedBlock) => {
                      const style =
                        SCHEDULE_STATUS_STYLES[block.service.status];
                      const start = formatMinutes(block.start);
                      const end = formatMinutes(block.end);
                      const time = `${start}–${end}`;
                      const pet = getAppointmentPetName(block.order.petId);
                      const label = `${pet} · ${getAppointmentServiceName(block.service.serviceId)}`;
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
                            className={`${block.cutStart ? 'cut-start' : ''} ${block.cutEnd ? 'cut-end' : ''}`}
                            $color={style.color}
                            $bg={style.background}
                            aria-label={`${time}, ${label}, ${style.label}`}
                            title={`${time} · ${label}`}
                            style={{
                              left: `calc(${block.leftPct}% + 1px)`,
                              width: `calc(${block.widthPct}% - 3px)`,
                              top: block.lane * LANE + 4,
                            }}
                          >
                            <span className="line" style={{ fontWeight: 600 }}>
                              {start}
                              <span className="end">–{end}</span>
                            </span>
                            <span className="line pet">{label}</span>
                          </Block>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              ))}
            </GridTable>
          </Frame>
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
