import { useCallback, useEffect, useRef, useState } from 'react';
import { extractApiError } from '@/services/AppointmentOrderService';
import CageAssignmentService from '@/services/CageAssignmentService';
import type { CageAssignment } from '@/types';
import {
  getActiveCageOrderId,
  indexActiveCagesByOrder,
} from './activeCageAssignments';

const POLL_INTERVAL_MS = 30_000;

export const useActiveCageAssignments = (
  isReceptionist: boolean,
  isListVisible: boolean
) => {
  const [activeCageByOrderId, setByOrder] = useState<
    ReadonlyMap<string, CageAssignment>
  >(() => new Map());
  const [activeCageError, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const fetchActiveCages = useCallback(
    async (supersede = false) => {
      if (!isReceptionist || (requestRef.current && !supersede)) return;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      try {
        const res = await CageAssignmentService.listCageAssignments(
          { active: true },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setByOrder(indexActiveCagesByOrder(res.data));
        setError(null);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        // A failed refresh is not evidence that a previously open cage is still assigned.
        setByOrder(new Map());
        setError(
          extractApiError(error, 'Không thể kiểm tra tình trạng phân chuồng')
            .message
        );
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setHasLoaded(true);
        }
      }
    },
    [isReceptionist]
  );

  const recordActiveCage = useCallback((assignment?: CageAssignment | null) => {
    const orderId = getActiveCageOrderId(assignment);
    if (assignment && orderId) {
      setByOrder(prev => new Map(prev).set(orderId, assignment));
    }
  }, []);

  useEffect(() => {
    if (!isReceptionist) {
      setByOrder(new Map());
      setError(null);
      setHasLoaded(false);
    }
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [isReceptionist]);

  useEffect(() => {
    if (!isReceptionist || !isListVisible) return;
    const refreshIfVisible = () => {
      if (!document.hidden) void fetchActiveCages();
    };
    void fetchActiveCages();
    const timer = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [fetchActiveCages, isReceptionist, isListVisible]);

  return {
    activeCageByOrderId,
    activeCageError,
    activeCageLoading: isReceptionist && !hasLoaded,
    fetchActiveCages,
    recordActiveCage,
  };
};
