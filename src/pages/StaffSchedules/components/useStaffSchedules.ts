import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { BusySchedule, StaffAppointment, StaffMember } from '@/types';
import StaffService from '@/services/StaffService';
import StaffScheduleService, {
  type ScheduleAccess,
  type ShiftWorkEntry,
  collectOrderWork,
  collectQueueWork,
} from '@/services/StaffScheduleService';
import AppointmentOrderService from '@/services/AppointmentOrderService';
import AppointmentServiceService, {
  extractApiError,
} from '@/services/AppointmentServiceService';

const ROLE_ORDER: Record<string, number> = { Veterinarian: 0, Groomer: 1 };
const ORDER_PAGE_LIMIT = 100;
/** 1000 bookings a week is far above the clinic's load; past it the screen says so */
const ORDER_MAX_PAGES = 10;

/** Vets first, then groomers, each by name */
const sortStaff = (staff: StaffMember[]): StaffMember[] =>
  [...staff].sort(
    (a, b) =>
      (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2) ||
      a.fullName.localeCompare(b.fullName, 'vi')
  );

const isAbort = (err: unknown, signal: AbortSignal) =>
  signal.aborted || axios.isCancel(err);

/**
 * Services assigned during the week. Admin and Receptionist read every booking of the
 * week (GET /appointment-orders lists each order with its services); a vet or groomer
 * reads their own queue (GET /appointment-services/my-queue).
 */
const loadWork = async ({
  own,
  selfId,
  from,
  to,
  signal,
}: {
  own: boolean;
  selfId?: string;
  from: string;
  to: string;
  signal: AbortSignal;
}): Promise<{ entries: ShiftWorkEntry[]; truncated: boolean }> => {
  if (own) {
    if (!selfId) return { entries: [], truncated: false };
    const res = await AppointmentServiceService.listMyQueue(undefined, {
      signal,
    });
    return {
      entries: collectQueueWork(res.data, selfId, from, to),
      truncated: false,
    };
  }
  const orders: StaffAppointment[] = [];
  let totalPages = 1;
  for (let page = 1; page <= ORDER_MAX_PAGES; page += 1) {
    const res = await AppointmentOrderService.listStaffAppointments(
      { from, to, page, limit: ORDER_PAGE_LIMIT },
      { signal }
    );
    orders.push(...(res.data || []));
    totalPages = res.pagination?.totalPages || 1;
    if (page >= totalPages) break;
  }
  return {
    entries: collectOrderWork(orders),
    truncated: totalPages > ORDER_MAX_PAGES,
  };
};

/**
 * Staff rows, busy shifts and assigned services of one week. Admin and Receptionist
 * see every vet and groomer; a vet or groomer sees only their own row
 * (GET /staff-schedules/me). The services only colour the cells, so when they fail
 * to load the busy shifts are still shown, with a warning.
 */
export const useStaffSchedules = ({
  access,
  from,
  to,
  self,
}: {
  access: ScheduleAccess;
  from?: string;
  to?: string;
  /** The signed-in vet or groomer, for the own-schedule view (memoised by the page) */
  self?: StaffMember;
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [busy, setBusy] = useState<BusySchedule[]>([]);
  const [work, setWork] = useState<ShiftWorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);
  const [workTruncated, setWorkTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!from || !to) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError(null);
    try {
      const own = access === 'viewOwn';
      const workPromise = loadWork({
        own,
        selfId: self?._id,
        from,
        to,
        signal,
      }).then(
        value => ({ ok: true as const, value }),
        (reason: unknown) => ({ ok: false as const, reason })
      );
      const [staffList, busyRes] = await Promise.all([
        own
          ? Promise.resolve(self ? [self] : [])
          : StaffService.listStaff(
              { status: 'Active', limit: 100 },
              { signal }
            ).then(res => res.items || []),
        own
          ? StaffScheduleService.listMine({ from, to }, { signal })
          : StaffScheduleService.list({ from, to }, { signal }),
      ]);
      const workResult = await workPromise;
      if (signal.aborted) return;
      setStaff(sortStaff(staffList));
      setBusy(busyRes.data || []);
      if (workResult.ok) {
        setWork(workResult.value.entries);
        setWorkTruncated(workResult.value.truncated);
        setWorkError(null);
      } else {
        if (isAbort(workResult.reason, signal)) return;
        setWork([]);
        setWorkTruncated(false);
        setWorkError(
          extractApiError(
            workResult.reason,
            'Không tải được việc được giao trong tuần'
          ).message
        );
      }
    } catch (err) {
      if (isAbort(err, signal)) return;
      setError(extractApiError(err, 'Không tải được lịch làm việc').message);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [access, from, to, self]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return {
    staff,
    busy,
    work,
    loading,
    error,
    workError,
    workTruncated,
    reload: load,
  };
};
