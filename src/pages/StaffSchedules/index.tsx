import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Modal,
  Space,
  Typography,
} from 'antd';
import { LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import type {
  BusySchedule,
  ClinicalStaffRole,
  StaffMember,
  StaffShift,
} from '@/types';
import StaffScheduleService, {
  type ShiftCell,
  busyKey,
  describeShiftCell,
  findBusyConflicts,
  getScheduleAccess,
  getShiftInfo,
  getShiftPhase,
  getWeekDates,
  indexBusySchedules,
  indexShiftWork,
  shiftWeek,
  validateClearBusy,
  validateMarkBusy,
} from '@/services/StaffScheduleService';
import { extractApiError } from '@/services/AppointmentServiceService';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import ScheduleGrid, { ScheduleLegend } from './components/ScheduleGrid';
import BusyShiftModal, { type BusyTarget } from './components/BusyShiftModal';
import { useStaffSchedules } from './components/useStaffSchedules';
import { useClinicClock } from './components/useClinicClock';
import PageTitle from '@/components/common/PageTitle';

const { Text } = Typography;
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface StoredUserInfo {
  _id?: string;
  code?: string;
  fullName?: string;
  role?: string;
  systemRole?: string;
}

/**
 * SCR-30 Ca làm việc (nghiệp vụ 7.4, UC-67). BE f19060f stores busy shifts only:
 * everyone can be assigned in every shift unless the shift is marked busy. Each
 * cell also shows the services assigned in that shift, so "free" means free.
 * - Admin: xem và quản lý (báo nghỉ, bỏ báo nghỉ; BE gọi là báo bận) những ca chưa qua;
 * - Lễ tân: xem mọi người;
 * - Bác sĩ, nhân viên spa: xem lịch của mình.
 */
const StaffSchedulesPage = () => {
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<StoredUserInfo>(STORAGE.USER_INFO);
  const me = user || storedUser || undefined;
  const role = normalizeRole(me?.role || me?.systemRole);
  const access = getScheduleAccess(role) ?? 'viewOwn';
  const canManage = access === 'manage';
  const { today, time: now } = useClinicClock();
  const [anchor, setAnchor] = useState(today);
  const dates = useMemo(() => getWeekDates(anchor), [anchor]);

  // The vet or groomer reading their own schedule
  const selfId = me?._id;
  const selfName = me?.fullName;
  const selfCode = me?.code;
  const self = useMemo<StaffMember | undefined>(
    () =>
      access === 'viewOwn' && selfId
        ? {
            _id: selfId,
            code: selfCode || '',
            fullName: selfName || 'Tôi',
            role: role as ClinicalStaffRole,
            status: 'Active',
          }
        : undefined,
    [access, selfId, selfName, selfCode, role]
  );

  const {
    staff,
    busy,
    work,
    loading,
    error,
    workError,
    workTruncated,
    reload,
  } = useStaffSchedules({
    access,
    from: dates[0],
    to: dates[6],
    self,
  });
  const busyByKey = useMemo(() => indexBusySchedules(busy), [busy]);
  const workByKey = useMemo(() => indexShiftWork(work), [work]);
  const staffNames = useMemo(
    () => new Map(staff.map(m => [m._id, m.fullName])),
    [staff]
  );
  const conflicts = useMemo(
    () =>
      access === 'viewOwn'
        ? []
        : findBusyConflicts({ busy, workByKey, staffNames, today, now }),
    [access, busy, workByKey, staffNames, today, now]
  );

  const [target, setTarget] = useState<BusyTarget | null>(null);
  const [savingKey, setSavingKey] = useState<string>();

  /** A cell as it stands right now, for the checks before saving */
  const cellOf = (
    staffId: string,
    date: string,
    shift: StaffShift
  ): ShiftCell | undefined => {
    const info = getShiftInfo(shift);
    if (!info) return undefined;
    const key = busyKey(staffId, date, shift);
    return describeShiftCell({
      shift: info,
      phase: getShiftPhase(date, shift, today, now),
      busy: busyByKey.get(key),
      work: workByKey.get(key),
      canManage,
    });
  };
  const targetCell = target
    ? cellOf(target.member._id, target.date, target.shift)
    : undefined;

  const markBusy = async (reason: string) => {
    if (!target || !targetCell || savingKey) return;
    const blocked = validateMarkBusy(targetCell);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    const key = busyKey(target.member._id, target.date, target.shift);
    const shown = new Set(targetCell.openWork.map(w => w.id));
    setSavingKey(key);
    try {
      const res = await StaffScheduleService.create({
        staffId: target.member._id,
        date: target.date,
        shift: target.shift,
        reason,
      });
      // The screen says "nghỉ" where the BE says "báo bận": use its own words
      toast.success('Đã báo nghỉ');
      setTarget(null);
      // UC-67 3b: the BE found unfinished services this screen did not list yet
      const unseen = (res.conflictingServices || []).filter(
        c => !shown.has(c.appointmentServiceId)
      );
      if (res.warning && unseen.length) {
        Modal.warning({
          title: 'Ca này còn việc chưa xong',
          content: (
            <Space direction="vertical" size={4}>
              <Text>{res.warning}</Text>
              {unseen.map(c => (
                <Text key={c.appointmentServiceId}>
                  • {c.orderCode} · {c.serviceName}
                  {c.scheduledStart ? ` · ${c.scheduledStart}` : ''}
                </Text>
              ))}
              <Text type="secondary">
                Đổi người phụ trách ở Tiếp nhận lịch hẹn.
              </Text>
            </Space>
          ),
        });
      }
      await reload();
    } catch (err) {
      const { message, status } = extractApiError(err, 'Không báo nghỉ được');
      toast.error(
        status === 409 ? 'Người này đã được báo nghỉ ca này.' : message
      );
      // 409: someone marked it meanwhile. 400: e.g. the day ended or the person
      // was deactivated; reloading shows what is stored now.
      if (status === 409) setTarget(null);
      if (status === 409 || status === 400) await reload();
    } finally {
      setSavingKey(undefined);
    }
  };

  const clearBusy = async (member: StaffMember, record: BusySchedule) => {
    if (savingKey) return;
    const cell = cellOf(member._id, record.date, record.shift);
    const blocked = cell
      ? validateClearBusy(cell)
      : 'Không rõ ca cần bỏ báo nghỉ.';
    if (blocked) {
      toast.error(blocked);
      return;
    }
    setSavingKey(busyKey(member._id, record.date, record.shift));
    try {
      await StaffScheduleService.remove(record._id);
      toast.success('Đã bỏ báo nghỉ');
    } catch (err) {
      toast.error(extractApiError(err, 'Không bỏ báo nghỉ được').message);
    } finally {
      setSavingKey(undefined);
      await reload();
    }
  };

  const title = access === 'viewOwn' ? 'Lịch làm việc của tôi' : 'Ca làm việc';
  const isThisWeek = dates.includes(today);

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <PageTitle>{title}</PageTitle>
          </div>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => reload()}
            disabled={loading}
          >
            Làm mới
          </Button>
        </PageHeader>

        <Space wrap size={8} style={{ marginBottom: 12 }}>
          <Button
            aria-label="Tuần trước"
            icon={<LeftOutlined />}
            onClick={() => setAnchor(a => shiftWeek(a, -1))}
          />
          <DatePicker
            aria-label="Chọn tuần"
            picker="week"
            allowClear={false}
            value={dayjs(anchor)}
            format={() =>
              dates.length
                ? `${dayjs(dates[0]).format('DD/MM')} – ${dayjs(dates[6]).format('DD/MM/YYYY')}`
                : ''
            }
            onChange={value => value && setAnchor(value.format('YYYY-MM-DD'))}
          />
          <Button
            aria-label="Tuần sau"
            icon={<RightOutlined />}
            onClick={() => setAnchor(a => shiftWeek(a, 1))}
          />
          <Button
            type={isThisWeek ? 'default' : 'primary'}
            ghost={!isThisWeek}
            disabled={isThisWeek}
            onClick={() => setAnchor(today)}
          >
            Tuần này
          </Button>
        </Space>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 12 }}
            action={
              <Button size="small" onClick={() => reload()}>
                Thử lại
              </Button>
            }
          />
        )}

        {!error && workError && (
          <Alert
            type="warning"
            showIcon
            message={`Không tải được việc được giao trong tuần: ${workError.replace(/\.$/, '')}.`}
            description="Danh sách việc trong từng ca có thể chưa đủ; các ca đi làm và nghỉ vẫn đúng."
            style={{ marginBottom: 12 }}
            action={
              <Button size="small" onClick={() => reload()}>
                Thử lại
              </Button>
            }
          />
        )}

        {!error && workTruncated && (
          <Alert
            type="warning"
            showIcon
            message="Tuần này có quá nhiều lịch hẹn, chỉ tính việc của 1000 lịch hẹn đầu."
            style={{ marginBottom: 12 }}
          />
        )}

        {!error && conflicts.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`${conflicts.length} ca đã báo nghỉ nhưng còn việc chưa xong`}
            description={
              <Space direction="vertical" size={2}>
                {conflicts.map(c => {
                  const d = dayjs(c.date);
                  return (
                    <Text key={`${c.staffId}|${c.date}|${c.shift.key}`}>
                      • {c.staffName} · ca {c.shift.label.toLowerCase()}{' '}
                      {WEEKDAYS[d.day()]} {d.format('DD/MM')} ·{' '}
                      {c.openWork.length} việc
                    </Text>
                  );
                })}
                <Text type="secondary">
                  Đổi người phụ trách các việc này ở Tiếp nhận lịch hẹn.
                </Text>
              </Space>
            }
            style={{ marginBottom: 12 }}
          />
        )}

        <ScheduleLegend canEdit={canManage} />

        <ScheduleGrid
          dates={dates}
          today={today}
          now={now}
          staff={staff}
          busyByKey={busyByKey}
          workByKey={workByKey}
          loading={loading}
          canEdit={canManage}
          savingKey={savingKey}
          onMarkBusy={(member, date, shift) => {
            const cell = cellOf(member._id, date, shift);
            const blocked = cell ? validateMarkBusy(cell) : 'Không rõ ca.';
            if (blocked) {
              toast.error(blocked);
              return;
            }
            setTarget({ member, date, shift });
          }}
          onClearBusy={clearBusy}
        />
      </Card>

      <BusyShiftModal
        key={
          target
            ? busyKey(target.member._id, target.date, target.shift)
            : 'none'
        }
        target={target}
        cell={targetCell}
        submitting={Boolean(savingKey)}
        onSubmit={markBusy}
        onClose={() => setTarget(null)}
      />
    </PageWrapper>
  );
};

export default StaffSchedulesPage;
