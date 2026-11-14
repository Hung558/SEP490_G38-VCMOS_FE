import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import type {
  AppointmentStatus,
  CageAssignment,
  CheckInAppointmentPayload,
  CreateCageAssignmentPayload,
  CreateWalkInBookingResult,
  StaffAppointment,
} from '@/types';
import AppointmentOrderService, {
  extractApiError,
  isReceptionCageError,
  readReceptionIntake,
} from '@/services/AppointmentOrderService';
import CageAssignmentService from '@/services/CageAssignmentService';
import { useActiveCageAssignments } from './useActiveCageAssignments';
import { useCageAvailability } from './useCageAvailability';
import { matchesActiveCageAssignment } from './activeCageAssignments';
import { getSelectedReceptionTodayGroup } from './receptionToday';
import type { ReceptionTodayGroup } from './receptionToday';
import { useReceptionToday } from './useReceptionToday';

interface StoredUserInfo {
  role?: string;
  systemRole?: string;
  [key: string]: unknown;
}

export const useAppointmentReception = () => {
  const { user } = useAuth();
  const storedUser = storage.getLocalStorage<StoredUserInfo>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const role = normalizeRole(effectiveUser?.role || effectiveUser?.systemRole);
  const isAdmin = role === 'Admin';
  const isReceptionist = role === 'Receptionist';

  // Tabs: appointments, shared calendar (SCR-17), customer lookup. Cage work lives on
  // the cage board (/cages); rows here only offer a shortcut to place or view a cage.
  const [activeTab, setActiveTab] = useState<
    'appointments' | 'schedule' | 'lookup'
  >('appointments');
  // Bumped after every change the shared calendar (SCR-17) shows
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const cageAvailability = useCageAvailability(
    isReceptionist,
    activeTab === 'appointments',
    scheduleRevision
  );
  const today = useReceptionToday(isReceptionist, activeTab === 'appointments');
  const refreshToday = today.refresh;

  const {
    activeCageByOrderId,
    activeCageError,
    activeCageLoading,
    fetchActiveCages,
    recordActiveCage,
  } = useActiveCageAssignments(
    isReceptionist,
    activeTab === 'appointments' || activeTab === 'schedule'
  );

  // Walk-in modal (Receptionist only); the phone is pre-filled from the lookup tab
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInPhone, setWalkInPhone] = useState<string | undefined>();

  // "Đặt lịch khám" on the home page links here with ?walkin=new. Open the form
  // once and drop the param, so a reload or back does not reopen it.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!isReceptionist || !searchParams.has('walkin')) return;
    setWalkInPhone(undefined);
    setWalkInOpen(true);
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('walkin');
        return next;
      },
      { replace: true }
    );
  }, [isReceptionist, searchParams, setSearchParams]);

  // Appointments List State
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listRevision, setListRevision] = useState(0);

  // Appointment Filters
  const [filterStatus, setFilterStatus] = useState<
    AppointmentStatus | undefined
  >();
  const [filterIsOnline, setFilterIsOnline] = useState<boolean | undefined>();
  const [filterCode, setFilterCode] = useState<string | undefined>();
  // Undefined means use the role's default; an empty object explicitly clears the date.
  const [dateFilter, setDateFilter] = useState<{
    from?: string;
    to?: string;
  }>();
  const defaultDate = isReceptionist ? today.date : undefined;
  const filterFrom = dateFilter ? dateFilter.from : defaultDate;
  const filterTo = dateFilter ? dateFilter.to : defaultDate;
  const selectedTodayGroup = getSelectedReceptionTodayGroup(today.date, {
    from: filterFrom,
    to: filterTo,
    status: filterStatus,
    code: filterCode,
    isOnline: filterIsOnline,
  });

  const hasFilters = Boolean(
    filterStatus ||
      filterIsOnline !== undefined ||
      (filterCode && filterCode.trim()) ||
      filterFrom !== defaultDate ||
      filterTo !== defaultDate
  );

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<StaffAppointment | null>(null);

  // Check-In Modal State (Receptionist only)
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<StaffAppointment | null>(
    null
  );
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const checkInPendingRef = useRef(false);

  // Cancel Appointment State (Receptionist only)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<StaffAppointment | null>(
    null
  );
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [serviceRefreshTrigger, setServiceRefreshTrigger] = useState(0);

  // Cage detail ("Xem chuồng") and per-row cage assignment (Receptionist only)
  const [selectedAssignment, setSelectedAssignment] =
    useState<CageAssignment | null>(null);
  const [assignmentDetailOpen, setAssignmentDetailOpen] = useState(false);
  const [assignmentDetailLoading, setAssignmentDetailLoading] = useState(false);
  const [assignmentDetailError, setAssignmentDetailError] = useState<
    string | null
  >(null);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [createAssignmentSubmitting, setCreateAssignmentSubmitting] =
    useState(false);
  const [targetAppointmentForCage, setTargetAppointmentForCage] =
    useState<StaffAppointment | null>(null);

  // Request race-condition guards
  const appointmentRequestIdRef = useRef(0);
  const appointmentAbortRef = useRef<AbortController | null>(null);

  const assignmentDetailRequestIdRef = useRef(0);
  const assignmentDetailAbortRef = useRef<AbortController | null>(null);

  // Ref tracking currently opened appointment in detail modal for real-time synchronization
  const selectedAppointmentRef = useRef<StaffAppointment | null>(null);

  // Fetch appointments list
  const fetchAppointments = useCallback(async () => {
    if (appointmentAbortRef.current) {
      appointmentAbortRef.current.abort();
    }
    const controller = new AbortController();
    appointmentAbortRef.current = controller;
    const currentReqId = ++appointmentRequestIdRef.current;

    setLoading(true);
    setListError(null);

    try {
      const res = await AppointmentOrderService.listStaffAppointments(
        {
          status: filterStatus,
          isOnline: filterIsOnline,
          code: filterCode,
          from: filterFrom,
          to: filterTo,
          page,
          limit,
        },
        { signal: controller.signal }
      );

      if (
        controller.signal.aborted ||
        currentReqId !== appointmentRequestIdRef.current
      )
        return;

      const items = res.data || [];
      setAppointments(items);
      setTotal(res.pagination?.total || 0);

      // Synchronize selectedAppointment if detail modal is open
      const currentSelected = selectedAppointmentRef.current;
      if (currentSelected) {
        const matched = items.find(a => a._id === currentSelected._id);
        if (matched) setSelectedAppointment(matched);
        else if (currentSelected.code) {
          // One lookup only when the open appointment is no longer on this page.
          void AppointmentOrderService.listStaffAppointments(
            { code: currentSelected.code, page: 1, limit: 1 },
            { signal: controller.signal }
          )
            .then(response => {
              if (
                controller.signal.aborted ||
                selectedAppointmentRef.current !== currentSelected
              )
                return;
              const fresh = response.data?.find(
                item => item._id === currentSelected._id
              );
              if (fresh) setSelectedAppointment(fresh);
            })
            .catch(() => {
              // Keep the open detail if its refresh fails.
            });
        }
      }
    } catch (err: unknown) {
      if (
        axios.isCancel(err) ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      if (
        controller.signal.aborted ||
        currentReqId !== appointmentRequestIdRef.current
      )
        return;

      const { message } = extractApiError(
        err,
        'Không thể tải danh sách lịch hẹn'
      );
      setListError(message);
      toast.error(message);
    } finally {
      if (
        !controller.signal.aborted &&
        currentReqId === appointmentRequestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [
    filterStatus,
    filterIsOnline,
    filterCode,
    filterFrom,
    filterTo,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchAppointments();
    return () => {
      if (appointmentAbortRef.current) {
        appointmentAbortRef.current.abort();
      }
    };
  }, [fetchAppointments, listRevision]);

  const refreshAppointmentList = useCallback(() => {
    // A mutation may finish after filters changed; let the effect use the latest query.
    setListRevision(current => current + 1);
    setScheduleRevision(current => current + 1);
    void fetchActiveCages(true);
    refreshToday();
  }, [fetchActiveCages, refreshToday]);

  // Filter actions
  const handleFilterStatus = (status?: AppointmentStatus) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleFilterIsOnline = (isOnline?: boolean) => {
    setFilterIsOnline(isOnline);
    setPage(1);
  };

  const handleFilterCode = (code?: string) => {
    setFilterCode(code);
    setPage(1);
  };

  const handleFilterDateRange = (from?: string, to?: string) => {
    setDateFilter({ from, to });
    setPage(1);
  };

  const resetFilters = () => {
    setFilterStatus(undefined);
    setFilterIsOnline(undefined);
    setFilterCode(undefined);
    setDateFilter(undefined);
    setPage(1);
  };

  const selectTodayGroup = (status: ReceptionTodayGroup['status']) => {
    if (!isReceptionist) return;
    setFilterStatus(status);
    setFilterIsOnline(undefined);
    setFilterCode(undefined);
    setDateFilter(undefined);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  // Detail Modal
  const openDetail = (appointment: StaffAppointment) => {
    selectedAppointmentRef.current = appointment;
    setSelectedAppointment(appointment);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    selectedAppointmentRef.current = null;
    setDetailOpen(false);
    setSelectedAppointment(null);
  };

  // Check-In Actions (Receptionist only)
  const openCheckIn = (appointment: StaffAppointment) => {
    if (!isReceptionist || appointment.derivedStatus !== 'Booked') return;
    setCheckInTarget(appointment);
    setCheckInOpen(true);
  };

  const closeCheckIn = () => {
    if (checkInSubmitting) return;
    setCheckInOpen(false);
    setCheckInTarget(null);
  };

  const checkInCageBlockedReason =
    checkInTarget && activeCageByOrderId.has(checkInTarget._id)
      ? 'Lịch hẹn này đã có chuồng. Có thể tiếp nhận mà không phân thêm chuồng.'
      : activeCageLoading || activeCageError
        ? 'Chưa xác nhận được tình trạng phân chuồng. Có thể tiếp nhận mà không phân chuồng.'
        : undefined;

  const confirmCheckIn = async (values: CheckInAppointmentPayload) => {
    if (!checkInTarget || !isReceptionist || checkInPendingRef.current) return;
    if (values.cageId && checkInCageBlockedReason)
      return { cageError: checkInCageBlockedReason };

    checkInPendingRef.current = true;
    setCheckInSubmitting(true);
    try {
      const res = await AppointmentOrderService.checkInAppointment(
        checkInTarget._id,
        values
      );
      const savedIntake = readReceptionIntake(res.data?.intake);
      const savedCage = res.data?.cageAssignment;
      const cageConfirmed =
        values.cageId &&
        matchesActiveCageAssignment(
          savedCage,
          checkInTarget._id,
          values.cageId
        );
      if (cageConfirmed) {
        recordActiveCage(savedCage);
      }
      if (values.intake && !savedIntake) {
        // The order may already be checked in, so refresh rather than resubmitting.
        toast.warning(
          'Không xác nhận được phiếu tiếp nhận đã lưu. Vui lòng kiểm tra lại lịch hẹn.'
        );
      }
      if (values.cageId && !cageConfirmed) {
        toast.warning(
          'Đã tiếp nhận lịch hẹn nhưng chưa xác nhận phân chuồng. Vui lòng kiểm tra lại.'
        );
      } else if (!values.intake || savedIntake) {
        toast.success(res.message || 'Tiếp nhận lịch hẹn thành công');
      }
      setCheckInOpen(false);
      setCheckInTarget(null);
      // Refresh current page to preserve page and filters
      refreshAppointmentList();
    } catch (err: unknown) {
      const { message, status, fieldErrors } = extractApiError(
        err,
        'Tiếp nhận lịch hẹn thất bại'
      );
      if (values.cageId && isReceptionCageError(status, message, fieldErrors)) {
        refreshAppointmentList();
        return {
          cageError:
            fieldErrors.cageId || fieldErrors.requiresIsolation || message,
        };
      }
      toast.error(message);
      // If 409 conflict or 404 not found, refresh page to reflect server reality
      if (status === 409 || status === 404) {
        setCheckInOpen(false);
        setCheckInTarget(null);
        refreshAppointmentList();
      }
    } finally {
      checkInPendingRef.current = false;
      setCheckInSubmitting(false);
    }
  };

  // Cancel Appointment Actions (Receptionist only)
  const openCancel = (appointment: StaffAppointment) => {
    if (
      !isReceptionist ||
      !['Booked', 'CheckedIn'].includes(appointment.derivedStatus)
    ) {
      return;
    }
    setCancelTarget(appointment);
    setCancelOpen(true);
  };

  const closeCancel = () => {
    if (cancelSubmitting) return;
    setCancelOpen(false);
    setCancelTarget(null);
  };

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget || !isReceptionist || cancelSubmitting) return;

    setCancelSubmitting(true);
    try {
      const res = await AppointmentOrderService.cancelAppointment(
        cancelTarget._id,
        { reason }
      );
      toast.success(res.message || 'Hủy lịch hẹn thành công');
      setCancelOpen(false);
      setCancelTarget(null);
      refreshAppointmentList();
      if (selectedAppointmentRef.current?._id === cancelTarget._id) {
        setServiceRefreshTrigger(count => count + 1);
      }
    } catch (err: unknown) {
      const { message, status } = extractApiError(err, 'Hủy lịch hẹn thất bại');
      toast.error(message);
      if (status === 409 || status === 404) {
        setCancelOpen(false);
        setCancelTarget(null);
        refreshAppointmentList();
        if (selectedAppointmentRef.current?._id === cancelTarget._id) {
          setServiceRefreshTrigger(count => count + 1);
        }
      }
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Cage Assignment Actions (Receptionist only)
  const openCreateAssignment = (appointment?: StaffAppointment) => {
    if (!isReceptionist) return;
    setTargetAppointmentForCage(appointment || null);
    setCreateAssignmentOpen(true);
  };

  const closeCreateAssignment = () => {
    if (createAssignmentSubmitting) return;
    setCreateAssignmentOpen(false);
    setTargetAppointmentForCage(null);
  };

  const handleCreateAssignment = async (data: CreateCageAssignmentPayload) => {
    if (!isReceptionist || createAssignmentSubmitting) return;
    // POST /cage-assignments does not reject an order that already holds a cage,
    // so a second submit would occupy two cages for one pet.
    if (activeCageByOrderId.has(data.orderId)) {
      toast.error(
        'Lịch hẹn này đã được phân chuồng. Hãy giải phóng chuồng cũ trước khi phân chuồng khác.'
      );
      return;
    }

    setCreateAssignmentSubmitting(true);
    try {
      const res = await CageAssignmentService.createCageAssignment(data);
      toast.success(res.message || 'Phân công chuồng thành công');
      setCreateAssignmentOpen(false);
      setTargetAppointmentForCage(null);
      recordActiveCage(res.data);
      void fetchActiveCages(true);
      setScheduleRevision(current => current + 1);
    } catch (err: unknown) {
      const { message, status } = extractApiError(
        err,
        'Phân công chuồng thất bại'
      );
      toast.error(message);
      // 409: the cage was taken meanwhile, reload which orders hold a cage
      if (status === 409) void fetchActiveCages(true);
    } finally {
      setCreateAssignmentSubmitting(false);
    }
  };

  const openAssignmentDetail = async (assignment: CageAssignment) => {
    setSelectedAssignment(assignment);
    setAssignmentDetailOpen(true);
    setAssignmentDetailLoading(true);
    setAssignmentDetailError(null);

    if (assignmentDetailAbortRef.current) {
      assignmentDetailAbortRef.current.abort();
    }
    const controller = new AbortController();
    assignmentDetailAbortRef.current = controller;
    const currentReqId = ++assignmentDetailRequestIdRef.current;

    try {
      const res = await CageAssignmentService.getCageAssignment(
        assignment._id,
        { signal: controller.signal }
      );
      if (currentReqId !== assignmentDetailRequestIdRef.current) return;
      if (res?.data) {
        setSelectedAssignment(res.data);
      }
    } catch (err: unknown) {
      if (
        axios.isCancel(err) ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      if (currentReqId !== assignmentDetailRequestIdRef.current) return;
      const { message } = extractApiError(
        err,
        'Không thể tải chi tiết phân công chuồng'
      );
      setAssignmentDetailError(message);
      toast.error(message);
    } finally {
      if (currentReqId === assignmentDetailRequestIdRef.current) {
        setAssignmentDetailLoading(false);
      }
    }
  };

  const closeAssignmentDetail = () => {
    if (assignmentDetailAbortRef.current) {
      assignmentDetailAbortRef.current.abort();
    }
    setAssignmentDetailOpen(false);
    setSelectedAssignment(null);
    setAssignmentDetailLoading(false);
    setAssignmentDetailError(null);
  };

  // Walk-in Actions (Receptionist only)
  const openWalkIn = (phone?: string) => {
    if (!isReceptionist) return;
    setWalkInPhone(phone);
    setWalkInOpen(true);
  };

  const closeWalkIn = () => {
    setWalkInOpen(false);
  };

  // File 1: after a 201 close the modal and reload the appointments and their cages,
  // so the new walk-in and its cage show up at once
  const handleWalkInCreated = (result: CreateWalkInBookingResult) => {
    setWalkInOpen(false);
    recordActiveCage(result.cageAssignment);
    refreshAppointmentList();
  };

  return {
    isAdmin,
    isReceptionist,
    activeTab,
    setActiveTab,
    scheduleRevision,
    cageAvailability,
    // Appointments
    appointments,
    total,
    page,
    limit,
    loading,
    listError,
    hasFilters,
    filterStatus,
    filterIsOnline,
    filterCode,
    filterFrom,
    filterTo,
    handleFilterStatus,
    handleFilterIsOnline,
    handleFilterCode,
    handleFilterDateRange,
    resetFilters,
    handlePageChange,
    refreshAppointmentList,
    today,
    selectedTodayGroup,
    selectTodayGroup,
    activeCageByOrderId,
    activeCageError,
    activeCageLoading,
    fetchActiveCages,
    // Detail
    detailOpen,
    selectedAppointment,
    openDetail,
    closeDetail,
    // Check-In
    checkInOpen,
    checkInTarget,
    checkInSubmitting,
    checkInCageBlockedReason,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
    // Cancel (Receptionist)
    cancelOpen,
    cancelTarget,
    serviceRefreshTrigger,
    cancelSubmitting,
    openCancel,
    closeCancel,
    confirmCancel,
    // Cage detail and per-row cage assignment
    selectedAssignment,
    assignmentDetailOpen,
    assignmentDetailLoading,
    assignmentDetailError,
    openAssignmentDetail,
    closeAssignmentDetail,
    createAssignmentOpen,
    createAssignmentSubmitting,
    targetAppointmentForCage,
    openCreateAssignment,
    closeCreateAssignment,
    handleCreateAssignment,
    // Walk-in
    walkInOpen,
    walkInPhone,
    openWalkIn,
    closeWalkIn,
    handleWalkInCreated,
  };
};
