import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import AppointmentOrderService, {
  extractApiError,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import AppointmentServiceService from '@/services/AppointmentServiceService';
import StaffService from '@/services/StaffService';
import type {
  OnlineAppointmentService,
  StaffAppointment,
  StaffMember,
} from '@/types';

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;
const SERVICE_CONCURRENCY = 4;

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

/** Runs `work` over `items` with at most `limit` requests at a time */
const mapLimited = async <T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    }
  );
  await Promise.all(runners);
  return results;
};

interface UseClinicScheduleOptions {
  /** Tab is on screen */
  active: boolean;
  /** Bumped by the reception page after every check-in, cancel, cage or staff change */
  revision: number;
}

/** Data of the shared staff calendar for one day (SCR-17) */
export const useClinicSchedule = ({
  active,
  revision,
}: UseClinicScheduleOptions) => {
  const [date, setDate] = useState(getVietnamTodayString);
  const [orders, setOrders] = useState<StaffAppointment[]>([]);
  const [servicesByOrder, setServicesByOrder] = useState<
    Map<string, OnlineAppointmentService[]>
  >(() => new Map());
  const [staff, setStaff] = useState<StaffMember[]>([]);
  // False when nobody has a shift on record for the day (no roster API yet)
  const [shiftKnown, setShiftKnown] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (day: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError(null);
    try {
      const staffPromise = StaffService.listStaffForDate(day, { signal });

      const dayOrders: StaffAppointment[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const res = await AppointmentOrderService.listStaffAppointments(
          { from: day, to: day, page, limit: PAGE_LIMIT },
          { signal }
        );
        dayOrders.push(...(res.data || []));
        const totalPages = res.pagination?.totalPages || 1;
        if (page >= totalPages) break;
      }

      const serviceLists = await mapLimited(
        dayOrders,
        SERVICE_CONCURRENCY,
        async order => {
          try {
            const res = await AppointmentServiceService.listOrderServices(
              order._id,
              { signal }
            );
            return res.data || [];
          } catch (err) {
            if (isAbort(err)) throw err;
            // One failed order must not hide the whole day
            return [];
          }
        }
      );

      const { onDuty, all } = await staffPromise;
      if (signal.aborted) return;
      const map = new Map<string, OnlineAppointmentService[]>();
      dayOrders.forEach((order, i) => map.set(order._id, serviceLists[i]));
      setOrders(dayOrders);
      setServicesByOrder(map);
      setShiftKnown(onDuty.length > 0);
      setStaff(onDuty.length > 0 ? onDuty : all);
    } catch (err) {
      if (isAbort(err) || signal.aborted) return;
      setError(extractApiError(err, 'Không tải được lịch chung').message);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void load(date);
  }, [active, date, revision, reloadTick, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    date,
    setDate,
    orders,
    servicesByOrder,
    staff,
    shiftKnown,
    loading,
    error,
    reload: () => setReloadTick(t => t + 1),
  };
};
