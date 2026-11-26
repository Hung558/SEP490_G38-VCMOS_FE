import { useEffect, useState } from 'react';
import {
  getVietnamCurrentTime,
  getVietnamTodayString,
} from '@/services/AppointmentServiceService';

const read = () => {
  const now = new Date();
  return {
    today: getVietnamTodayString(now),
    time: getVietnamCurrentTime(now),
  };
};

/**
 * Today's date and the HH:mm time in Vietnam, refreshed every `stepMs`, so a shift
 * that ends while the page is open turns into a past one without a reload.
 */
export const useClinicClock = (stepMs = 30_000) => {
  const [clock, setClock] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = read();
      setClock(prev =>
        prev.today === next.today && prev.time === next.time ? prev : next
      );
    }, stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return clock;
};
