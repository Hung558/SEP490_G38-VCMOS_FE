import { useCallback, useEffect, useState } from 'react';
import AppointmentOrderService, {
  extractApiError,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import {
  getReceptionTodayCountQuery,
  readReceptionTodayCount,
  RECEPTION_TODAY_GROUPS,
} from './receptionToday';
import type { ReceptionTodayCounts } from './receptionToday';

type SummaryResult = {
  date: string;
  revision: number;
} & (
  | { counts: ReceptionTodayCounts; error?: never }
  | { counts?: never; error: string }
);

export const useReceptionToday = (
  isReceptionist: boolean,
  isListVisible: boolean
) => {
  const [date, setDate] = useState(getVietnamTodayString);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<SummaryResult>();

  const refresh = useCallback(() => {
    if (!isReceptionist) return;
    setDate(getVietnamTodayString());
    setRevision(current => current + 1);
  }, [isReceptionist]);

  useEffect(() => {
    if (!isReceptionist) return;
    // Vietnam is UTC+07:00 year-round. Update the date even if this screen stays open overnight.
    const midnight = Date.parse(`${date}T00:00:00+07:00`) + 86_400_000;
    const timer = window.setTimeout(
      refresh,
      Math.max(0, midnight - Date.now())
    );
    return () => window.clearTimeout(timer);
  }, [date, isReceptionist, refresh]);

  useEffect(() => {
    if (!isReceptionist || !isListVisible) return;
    const refreshIfVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () =>
      document.removeEventListener('visibilitychange', refreshIfVisible);
  }, [isReceptionist, isListVisible, refresh]);

  useEffect(() => {
    if (!isListVisible) setResult(undefined);
  }, [isListVisible]);

  useEffect(() => {
    if (!isReceptionist || !isListVisible) return;
    const controller = new AbortController();
    const { signal } = controller;
    const queries = RECEPTION_TODAY_GROUPS.map(async ({ key, status }) => {
      const response = await AppointmentOrderService.listStaffAppointments(
        getReceptionTodayCountQuery(date, status),
        { signal }
      );
      return [key, readReceptionTodayCount(response)] as const;
    });

    void Promise.all(queries).then(
      entries => {
        if (signal.aborted) return;
        setResult({
          date,
          revision,
          counts: Object.fromEntries(entries) as ReceptionTodayCounts,
        });
      },
      (error: unknown) => {
        if (signal.aborted) return;
        controller.abort();
        setResult({
          date,
          revision,
          error: extractApiError(error, 'Không thể tải tổng quan lịch hẹn')
            .message,
        });
      }
    );
    return () => controller.abort();
  }, [date, revision, isReceptionist, isListVisible]);

  const current =
    result?.date === date && result.revision === revision ? result : undefined;
  return { date, counts: current?.counts, error: current?.error, refresh };
};
