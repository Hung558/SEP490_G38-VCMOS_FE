import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { BusySchedule, StaffMember } from '@/types';
import StaffService from '@/services/StaffService';
import StaffScheduleService, {
  type ScheduleAccess,
} from '@/services/StaffScheduleService';
import { extractApiError } from '@/services/AppointmentServiceService';

const ROLE_ORDER: Record<string, number> = { Veterinarian: 0, Groomer: 1 };

/** Vets first, then groomers, each by name */
const sortStaff = (staff: StaffMember[]): StaffMember[] =>
  [...staff].sort(
    (a, b) =>
      (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2) ||
      a.fullName.localeCompare(b.fullName, 'vi')
  );

/**
 * Staff rows and busy shifts of one week. Admin and Receptionist see every vet and
 * groomer; a vet or groomer sees only their own row (GET /staff-schedules/me).
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (signal.aborted) return;
      setStaff(sortStaff(staffList));
      setBusy(busyRes.data || []);
    } catch (err) {
      if (axios.isCancel(err) || signal.aborted) return;
      setError(extractApiError(err, 'Không tải được lịch làm việc').message);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [access, from, to, self]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { staff, busy, loading, error, reload: load };
};
