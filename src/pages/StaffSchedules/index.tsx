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
  SHIFT_INFO,
  busyKey,
  getScheduleAccess,
  getWeekDates,
  indexBusySchedules,
  shiftWeek,
} from '@/services/StaffScheduleService';
import {
  extractApiError,
  getVietnamTodayString,
} from '@/services/AppointmentServiceService';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import ScheduleGrid from './components/ScheduleGrid';
import BusyShiftModal, { type BusyTarget } from './components/BusyShiftModal';
import { useStaffSchedules } from './components/useStaffSchedules';
import PageTitle from '@/components/common/PageTitle';

const { Text } = Typography;

interface StoredUserInfo {
  _id?: string;
  code?: string;
  fullName?: string;
  role?: string;
  systemRole?: string;
}

/**
 * SCR-30 Ca làm việc (nghiệp vụ 7.4, UC-67). BE f19060f stores busy shifts only:
 * everyone works every shift unless a shift is marked busy.
 * - Admin: xem và quản lý (báo bận, bỏ báo bận);
 * - Lễ tân: xem mọi người;
 * - Bác sĩ, Groomer: xem lịch của mình.
 */
const StaffSchedulesPage = () => {
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<StoredUserInfo>(STORAGE.USER_INFO);
  const me = user || storedUser || undefined;
  const role = normalizeRole(me?.role || me?.systemRole);
  const access = getScheduleAccess(role) ?? 'viewOwn';
  const today = getVietnamTodayString();
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

  const { staff, busy, loading, error, reload } = useStaffSchedules({
    access,
    from: dates[0],
    to: dates[6],
    self,
  });
  const busyByKey = useMemo(() => indexBusySchedules(busy), [busy]);

  const [target, setTarget] = useState<BusyTarget | null>(null);
  const [savingKey, setSavingKey] = useState<string>();

  const markBusy = async (reason: string) => {
    if (!target || savingKey) return;
    const key = busyKey(target.member._id, target.date, target.shift);
    setSavingKey(key);
    try {
      const res = await StaffScheduleService.create({
        staffId: target.member._id,
        date: target.date,
        shift: target.shift,
        reason,
      });
      toast.success(res.message || 'Đã báo bận');
      setTarget(null);
      // UC-67 3b: services still waiting for this person in that shift
      if (res.warning) {
        Modal.warning({
          title: 'Ca này còn việc chưa xong',
          content: (
            <Space direction="vertical" size={4}>
              <Text>{res.warning}</Text>
              {res.conflictingServices.map(c => (
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
      toast.error(extractApiError(err, 'Không báo bận được').message);
    } finally {
      setSavingKey(undefined);
    }
  };

  const clearBusy = async (member: StaffMember, record: BusySchedule) => {
    if (savingKey) return;
    setSavingKey(busyKey(member._id, record.date, record.shift));
    try {
      const res = await StaffScheduleService.remove(record._id);
      toast.success(res.message || 'Đã bỏ báo bận');
      await reload();
    } catch (err) {
      toast.error(extractApiError(err, 'Không bỏ báo bận được').message);
      await reload();
    } finally {
      setSavingKey(undefined);
    }
  };

  const title = access === 'viewOwn' ? 'Lịch làm việc của tôi' : 'Ca làm việc';

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
          {!dates.includes(today) && (
            <Button type="link" onClick={() => setAnchor(today)}>
              Tuần này
            </Button>
          )}
          <Text type="secondary">
            {SHIFT_INFO.map(s => `${s.label} ${s.time}`).join(' · ')}
          </Text>
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

        <ScheduleGrid
          dates={dates}
          today={today}
          staff={staff}
          busyByKey={busyByKey}
          loading={loading}
          canEdit={access === 'manage'}
          savingKey={savingKey}
          onMarkBusy={(member, date, shift: StaffShift) =>
            setTarget({ member, date, shift })
          }
          onClearBusy={clearBusy}
        />
      </Card>

      <BusyShiftModal
        target={target}
        submitting={Boolean(savingKey)}
        onSubmit={markBusy}
        onClose={() => setTarget(null)}
      />
    </PageWrapper>
  );
};

export default StaffSchedulesPage;
