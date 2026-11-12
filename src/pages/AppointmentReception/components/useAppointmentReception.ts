import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { normalizeRole } from '@/constants/roles';
import { STORAGE, storage } from '@/lib/storage';
import type {
  AppointmentStatus,
  CageAssignment,
  CreateCageAssignmentPayload,
  CreateWalkInBookingResult,
  StaffAppointment,
} from '@/types';
import AppointmentOrderService, {
  extractApiError,
} from '@/services/AppointmentOrderService';
import CageAssignmentService from '@/services/CageAssignmentService';

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

  // Navigation tab: cage assignments are Receptionist only, customer lookup is
  // open to Admin too
  const [activeTab, setActiveTab] = useState<
    'appointments' | 'assignments' | 'lookup'
  >('appointments');

  // Walk-in modal (Receptionist only); the phone is pre-filled from the lookup tab
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInPhone, setWalkInPhone] = useState<string | undefined>();

  // Appointments List State
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Appointment Filters
  const [filterStatus, setFilterStatus] = useState<
    AppointmentStatus | undefined
  >();
  const [filterIsOnline, setFilterIsOnline] = useState<boolean | undefined>();
  const [filterCode, setFilterCode] = useState<string | undefined>();
  const [filterFrom, setFilterFrom] = useState<string | undefined>();
  const [filterTo, setFilterTo] = useState<string | undefined>();

  const hasFilters = Boolean(
    filterStatus ||
      filterIsOnline !== undefined ||
      (filterCode && filterCode.trim()) ||
      filterFrom ||
      filterTo
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

  // Cancel Appointment State (Receptionist only)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<StaffAppointment | null>(
    null
  );
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [serviceRefreshTrigger, setServiceRefreshTrigger] = useState(0);

  // Cage Assignments State (Receptionist only)
  const [assignments, setAssignments] = useState<CageAssignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentActiveFilter, setAssignmentActiveFilter] = useState<
    boolean | undefined
  >();
  const [assignmentCageIdFilter, setAssignmentCageIdFilter] = useState<
    string | undefined
  >();
  const [assignmentOrderIdFilter, setAssignmentOrderIdFilter] = useState<
    string | undefined
  >();
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

  const assignmentRequestIdRef = useRef(0);
  const assignmentAbortRef = useRef<AbortController | null>(null);

  const assignmentDetailRequestIdRef = useRef(0);
  const assignmentDetailAbortRef = useRef<AbortController | null>(null);

  // Ref tracking currently opened appointment in detail modal for real-time synchronization
  const selectedAppointmentRef = useRef<StaffAppointment | null>(null);
  selectedAppointmentRef.current = selectedAppointment;

  // Refresh single selected appointment from server to keep detail modal in sync
  const refreshSelectedAppointment = useCallback(
    async (targetCode?: string) => {
      const code = targetCode || selectedAppointmentRef.current?.code;
      const currentId = selectedAppointmentRef.current?._id;
      if (!code) return;

      try {
        const res = await AppointmentOrderService.listStaffAppointments({
          code,
          page: 1,
          limit: 1,
        });
        const fresh =
          (res.data || []).find(a =>
            currentId ? a._id === currentId : a.code === code
          ) || res.data?.[0];
        if (fresh) {
          setSelectedAppointment(fresh);
          setAppointments(prev =>
            prev.map(item => (item._id === fresh._id ? fresh : item))
          );
        }
      } catch {
        // Keep current state on error
      }
    },
    []
  );

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

      if (currentReqId !== appointmentRequestIdRef.current) return;

      const items = res.data || [];
      setAppointments(items);
      setTotal(res.pagination?.total || 0);

      // Synchronize selectedAppointment if detail modal is open
      const currentSelected = selectedAppointmentRef.current;
      if (currentSelected) {
        const matched = items.find(a => a._id === currentSelected._id);
        if (matched) {
          setSelectedAppointment(matched);
        } else if (currentSelected.code) {
          // If filtered out from current list/page, refresh by code to keep modal content up-to-date
          refreshSelectedAppointment(currentSelected.code);
        }
      }
    } catch (err: unknown) {
      if (
        axios.isCancel(err) ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      if (currentReqId !== appointmentRequestIdRef.current) return;

      const { message } = extractApiError(
        err,
        'Không thể tải danh sách lịch hẹn'
      );
      setListError(message);
      toast.error(message);
    } finally {
      if (currentReqId === appointmentRequestIdRef.current) {
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
    refreshSelectedAppointment,
  ]);

  useEffect(() => {
    fetchAppointments();
    return () => {
      if (appointmentAbortRef.current) {
        appointmentAbortRef.current.abort();
      }
    };
  }, [fetchAppointments]);

  // Fetch cage assignments (Receptionist only)
  const fetchAssignments = useCallback(async () => {
    if (!isReceptionist) return;

    if (assignmentAbortRef.current) {
      assignmentAbortRef.current.abort();
    }
    const controller = new AbortController();
    assignmentAbortRef.current = controller;
    const currentReqId = ++assignmentRequestIdRef.current;

    setAssignmentLoading(true);
    setAssignmentError(null);

    try {
      const res = await CageAssignmentService.listCageAssignments(
        {
          active: assignmentActiveFilter,
          cageId: assignmentCageIdFilter,
          orderId: assignmentOrderIdFilter,
        },
        { signal: controller.signal }
      );

      if (currentReqId !== assignmentRequestIdRef.current) return;

      setAssignments(res.data || []);
    } catch (err: unknown) {
      if (
        axios.isCancel(err) ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      if (currentReqId !== assignmentRequestIdRef.current) return;

      const { message } = extractApiError(
        err,
        'Không thể tải danh sách phân công chuồng'
      );
      setAssignmentError(message);
      toast.error(message);
    } finally {
      if (currentReqId === assignmentRequestIdRef.current) {
        setAssignmentLoading(false);
      }
    }
  }, [
    isReceptionist,
    assignmentActiveFilter,
    assignmentCageIdFilter,
    assignmentOrderIdFilter,
  ]);

  useEffect(() => {
    if (isReceptionist && activeTab === 'assignments') {
      fetchAssignments();
    }
    return () => {
      if (assignmentAbortRef.current) {
        assignmentAbortRef.current.abort();
      }
    };
  }, [isReceptionist, activeTab, fetchAssignments]);

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
    setFilterFrom(from);
    setFilterTo(to);
    setPage(1);
  };

  const resetFilters = () => {
    setFilterStatus(undefined);
    setFilterIsOnline(undefined);
    setFilterCode(undefined);
    setFilterFrom(undefined);
    setFilterTo(undefined);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  // Detail Modal
  const openDetail = (appointment: StaffAppointment) => {
    setSelectedAppointment(appointment);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedAppointment(null);
  };

  const handleDetailUpdated = useCallback(() => {
    fetchAppointments();
    refreshSelectedAppointment();
  }, [fetchAppointments, refreshSelectedAppointment]);

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

  const confirmCheckIn = async () => {
    if (!checkInTarget || !isReceptionist || checkInSubmitting) return;

    setCheckInSubmitting(true);
    try {
      const res = await AppointmentOrderService.checkInAppointment(
        checkInTarget._id
      );
      toast.success(res.message || 'Tiếp nhận lịch hẹn thành công');
      setCheckInOpen(false);
      setCheckInTarget(null);
      // Refresh current page to preserve page and filters
      fetchAppointments();
    } catch (err: unknown) {
      const { message, status } = extractApiError(
        err,
        'Tiếp nhận lịch hẹn thất bại'
      );
      toast.error(message);
      // If 409 conflict or 404 not found, refresh page to reflect server reality
      if (status === 409 || status === 404) {
        setCheckInOpen(false);
        setCheckInTarget(null);
        fetchAppointments();
      }
    } finally {
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
      fetchAppointments();
      if (selectedAppointmentRef.current?._id === cancelTarget._id) {
        setServiceRefreshTrigger(count => count + 1);
      }
    } catch (err: unknown) {
      const { message, status } = extractApiError(err, 'Hủy lịch hẹn thất bại');
      toast.error(message);
      if (status === 409 || status === 404) {
        setCancelOpen(false);
        setCancelTarget(null);
        fetchAppointments();
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

    setCreateAssignmentSubmitting(true);
    try {
      const res = await CageAssignmentService.createCageAssignment(data);
      toast.success(res.message || 'Phân công chuồng thành công');
      setCreateAssignmentOpen(false);
      setTargetAppointmentForCage(null);
      // Refresh assignments if in tab, and refresh appointments
      if (activeTab === 'assignments') {
        fetchAssignments();
      }
    } catch (err: unknown) {
      const { message, status } = extractApiError(
        err,
        'Phân công chuồng thất bại'
      );
      toast.error(message);
      // If 409 conflict (cage occupied), refresh assignment list
      if (status === 409) {
        fetchAssignments();
      }
    } finally {
      setCreateAssignmentSubmitting(false);
    }
  };

  // Cage assignment filter handlers
  const handleAssignmentActiveFilter = (active?: boolean) => {
    setAssignmentActiveFilter(active);
  };

  const handleAssignmentCageIdFilter = (cageId?: string) => {
    setAssignmentCageIdFilter(cageId);
  };

  const handleAssignmentOrderIdFilter = (orderId?: string) => {
    setAssignmentOrderIdFilter(orderId);
  };

  const resetAssignmentFilters = () => {
    setAssignmentActiveFilter(undefined);
    setAssignmentCageIdFilter(undefined);
    setAssignmentOrderIdFilter(undefined);
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

  // File 1: after a 201 close the modal and reload the appointments and the cage
  // assignments, so the new walk-in and its cage show up at once
  const handleWalkInCreated = (result: CreateWalkInBookingResult) => {
    setWalkInOpen(false);
    fetchAppointments();
    if (result.cageAssignment) fetchAssignments();
  };

  return {
    isAdmin,
    isReceptionist,
    activeTab,
    setActiveTab,
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
    fetchAppointments,
    // Detail
    detailOpen,
    selectedAppointment,
    openDetail,
    closeDetail,
    refreshSelectedAppointment,
    handleDetailUpdated,
    // Check-In
    checkInOpen,
    checkInTarget,
    checkInSubmitting,
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
    // Assignments
    assignments,
    assignmentLoading,
    assignmentError,
    assignmentActiveFilter,
    assignmentCageIdFilter,
    assignmentOrderIdFilter,
    handleAssignmentActiveFilter,
    handleAssignmentCageIdFilter,
    handleAssignmentOrderIdFilter,
    resetAssignmentFilters,
    fetchAssignments,
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
