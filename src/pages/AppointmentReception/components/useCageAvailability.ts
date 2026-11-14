import { useCallback, useEffect, useState } from 'react';
import CageService from '@/services/CageService';

const POLL_MS = 30_000;

/** "Available cages (n / total)" counter of the receptionist dashboard (SCR-16) */
export const useCageAvailability = (
  enabled: boolean,
  isVisible: boolean,
  revision: number
) => {
  const [summary, setSummary] = useState<{
    available: number;
    total: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await CageService.listCages({ limit: 100 });
      const items = res.data?.items || [];
      setSummary({
        available: items.filter(c => c.status === 'Available').length,
        total: items.length,
      });
    } catch {
      // The counter is a hint; the cage board shows the real error
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isVisible) return;
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, isVisible, revision, load]);

  return summary;
};
