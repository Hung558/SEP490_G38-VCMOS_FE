import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiError } from '@/services/AppointmentServiceService';
import type { SubtaskRequest } from '@/services/SubtaskRequestService';

type Load = (signal: AbortSignal) => Promise<{ data: SubtaskRequest[] }>;

export const useSubtaskList = (load: Load) => {
  const [items, setItems] = useState<SubtaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const request = useRef<AbortController>();

  // `silent` (a background poll) keeps the rows on screen instead of showing
  // the loading state. Anything else passed in (a click event) is not silent.
  const refresh = useCallback(
    async (options?: unknown) => {
      const silent =
        (options as { silent?: unknown } | undefined)?.silent === true;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (!silent) setLoading(true);
      setError(undefined);
      try {
        const response = await load(controller.signal);
        if (!Array.isArray(response.data))
          throw new Error('Danh sách máy chủ trả về không hợp lệ.');
        if (!controller.signal.aborted) setItems(response.data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(extractApiError(err, 'Không tải được yêu cầu.').message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [load]
  );

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  return { items, error, loading, refresh };
};
