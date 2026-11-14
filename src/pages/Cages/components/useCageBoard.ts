import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import CageService, { type Cage } from '@/services/CageService';
import CageAssignmentService from '@/services/CageAssignmentService';
import AppointmentOrderService, {
  extractApiError,
  getAppointmentOwnerName,
  getAppointmentOwnerPhone,
  getAppointmentPetName,
} from '@/services/AppointmentOrderService';
import PetService from '@/services/PetService';
import type { CageAssignment, StaffAppointment } from '@/types';
import {
  CAGE_BOARD_REFRESH_MS,
  CAGE_HOLDING_ORDER_STATUSES,
  getAssignmentOrder,
  getOrderPetId,
  indexOpenAssignmentsByCage,
  pickOrdersWithoutCage,
} from './cageBoardHelpers';

/** What a cage card shows about the pet inside (fetched once per order) */
export interface CageOccupant {
  petName?: string;
  photoUrl?: string | null;
  weight?: number | null;
  ownerName?: string;
  ownerPhone?: string;
}

interface UseCageBoardOptions {
  /** Board view is on screen; polling stops otherwise */
  active: boolean;
  /** Clinic staff can read cage assignments (Admin gets 403) */
  canSeeOccupants: boolean;
  /** Receptionist can look orders up (owner phone) and assign/move/release */
  isReceptionist: boolean;
}

export const useCageBoard = ({
  active,
  canSeeOccupants,
  isReceptionist,
}: UseCageBoardOptions) => {
  const [cages, setCages] = useState<Cage[]>([]);
  const [assignments, setAssignments] = useState<CageAssignment[]>([]);
  const [occupants, setOccupants] = useState<Map<string, CageOccupant>>(
    () => new Map()
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mutating, setMutating] = useState(false);

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const occupantRequestedRef = useRef(new Set<string>());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pet name/photo/weight (any clinic staff) and owner (Receptionist), fetched once per order
  const loadOccupant = useCallback(
    async (orderId: string, order?: StaffAppointment) => {
      if (occupantRequestedRef.current.has(orderId)) return;
      occupantRequestedRef.current.add(orderId);
      const occupant: CageOccupant = {};
      const petId = getOrderPetId(order);
      const [petResult, orderResult] = await Promise.allSettled([
        petId ? PetService.getPetById(petId) : Promise.resolve(undefined),
        isReceptionist && order?.code
          ? AppointmentOrderService.listStaffAppointments({
              code: order.code,
              page: 1,
              limit: 1,
            })
          : Promise.resolve(undefined),
      ]);
      if (petResult.status === 'fulfilled' && petResult.value?.pet) {
        const pet = petResult.value.pet;
        occupant.petName = pet.name;
        occupant.photoUrl = pet.photoUrl;
        occupant.weight = pet.weight;
      }
      if (orderResult.status === 'fulfilled' && orderResult.value) {
        const full = orderResult.value.data?.find(o => o._id === orderId);
        if (full) {
          occupant.petName =
            occupant.petName || getAppointmentPetName(full.petId);
          occupant.ownerName = getAppointmentOwnerName(full.ownerId);
          const phone = getAppointmentOwnerPhone(full.ownerId);
          occupant.ownerPhone = phone !== '-' ? phone : undefined;
        }
      }
      if (!mountedRef.current) return;
      // Nothing loaded: allow a later refresh to try again
      if (!occupant.petName && !occupant.ownerName) {
        occupantRequestedRef.current.delete(orderId);
        return;
      }
      setOccupants(prev => new Map(prev).set(orderId, occupant));
    },
    [isReceptionist]
  );

  // An Occupied cage with no open assignment: its latest assignment (null = never
  // assigned), so the card tells what really happened instead of guessing
  const [cageHistory, setCageHistory] = useState<
    Map<string, CageAssignment | null>
  >(() => new Map());
  const historyCheckedRef = useRef(new Map<string, string>());

  const loadCageHistory = useCallback(async (cage: Cage) => {
    const stamp = cage.updatedAt || '';
    if (historyCheckedRef.current.get(cage._id) === stamp) return;
    historyCheckedRef.current.set(cage._id, stamp);
    try {
      // Newest first (assignedAt descending)
      const res = await CageAssignmentService.listCageAssignments({
        cageId: cage._id,
      });
      if (!mountedRef.current) return;
      setCageHistory(prev =>
        new Map(prev).set(cage._id, (res.data || [])[0] ?? null)
      );
    } catch {
      historyCheckedRef.current.delete(cage._id);
    }
  }, []);

  // A refresh asked for while one is running (e.g. right after a mutation) runs next
  const pendingRef = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    try {
      const [cageRes, assignmentRes] = await Promise.all([
        CageService.listCages({ limit: 100, sort: 'label' }),
        canSeeOccupants
          ? CageAssignmentService.listCageAssignments({ active: true })
          : Promise.resolve(undefined),
      ]);
      if (!mountedRef.current) return;
      setCages(cageRes.data?.items || []);
      const open = assignmentRes?.data || [];
      setAssignments(open);
      setError(null);
      setLastUpdated(new Date());
      for (const assignment of open) {
        const { id, order } = getAssignmentOrder(assignment);
        if (id) void loadOccupant(id, order);
      }
      if (canSeeOccupants) {
        const openByCage = indexOpenAssignmentsByCage(open);
        for (const cage of cageRes.data?.items || []) {
          if (cage.status === 'Occupied' && !openByCage.has(cage._id)) {
            void loadCageHistory(cage);
          }
        }
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(extractApiError(err, 'Không thể tải sơ đồ chuồng').message);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoaded(true);
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false;
        void refreshRef.current();
      }
    }
  }, [canSeeOccupants, loadOccupant, loadCageHistory]);
  refreshRef.current = refresh;

  // Poll while the board is on screen and the browser tab is visible
  useEffect(() => {
    if (!active) return;
    void refresh();
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(tick, CAGE_BOARD_REFRESH_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [active, refresh]);

  const assignmentsByCage = indexOpenAssignmentsByCage(assignments);

  /** Checked-in orders without a cage, for "Xếp thú cưng" (Receptionist) */
  const loadOrdersWithoutCage = useCallback(async () => {
    const results = await Promise.all(
      CAGE_HOLDING_ORDER_STATUSES.map(status =>
        AppointmentOrderService.listStaffAppointments({
          status,
          page: 1,
          limit: 100,
        })
      )
    );
    const orders = results.flatMap(r => r.data || []);
    const open = await CageAssignmentService.listCageAssignments({
      active: true,
    });
    return pickOrdersWithoutCage(orders, open.data || []);
  }, []);

  /** Weight of an order's pet for the BR-11 check; undefined when unknown */
  const loadPetWeight = useCallback(
    async (petId?: string): Promise<number | undefined> => {
      if (!petId) return undefined;
      try {
        const res = await PetService.getPetById(petId);
        const weight = res.pet?.weight;
        return typeof weight === 'number' && weight > 0 ? weight : undefined;
      } catch {
        return undefined;
      }
    },
    []
  );

  const runMutation = useCallback(
    async (work: () => Promise<void>) => {
      if (mutating) return false;
      setMutating(true);
      try {
        await work();
        return true;
      } catch (err: unknown) {
        toast.error(extractApiError(err, 'Thao tác chuồng thất bại').message);
        return false;
      } finally {
        setMutating(false);
        void refresh();
      }
    },
    [mutating, refresh]
  );

  const assignPet = (cage: Cage, order: StaffAppointment) =>
    runMutation(async () => {
      await CageAssignmentService.createCageAssignment({
        cageId: cage._id,
        orderId: order._id,
      });
      toast.success(`Đã xếp ${order.code} vào chuồng ${cage.label}`);
    });

  const releasePet = (cage: Cage, assignment: CageAssignment) =>
    runMutation(async () => {
      await CageAssignmentService.releaseAssignment(assignment._id);
      toast.success(`Đã giải phóng chuồng ${cage.label}`);
    });

  return {
    cages,
    assignmentsByCage,
    occupants,
    cageHistory,
    loaded,
    error,
    lastUpdated,
    mutating,
    refresh,
    loadOrdersWithoutCage,
    loadPetWeight,
    assignPet,
    releasePet,
  };
};
