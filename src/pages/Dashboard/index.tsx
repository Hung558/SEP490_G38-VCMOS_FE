import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import styled from 'styled-components';
import {
  Card,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Segmented,
  Avatar,
  Tooltip,
  DatePicker,
  Select,
  Alert,
  Tabs,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  ReadOutlined,
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AppointmentOrderService, {
  getAppointmentStatusColor,
  getOrderStatusText,
  extractApiError,
  canOwnerCancelAppointment,
  getOwnerCancelState,
  getVietnamTodayString,
  OWNER_CANCEL_DEADLINE_MESSAGE,
} from '@/services/AppointmentOrderService';
import type { OnlineAppointment, AppointmentStatus } from '@/types';
import AppointmentDetailModal from './components/AppointmentDetailModal';
import AddAppointmentServiceModal from './components/AddAppointmentServiceModal';
import CancelReasonModal from '@/components/appointment/CancelReasonModal';
import {
  isAppointmentEligibleForService,
  isUserPetOwner,
  getAppointmentServiceStaffName,
} from '@/services/AppointmentServiceService';
import QuickBookingSection from '@/pages/Home/components/QuickBookingSection';
import {
  getJourneyLink,
  parseDashboardTab,
  parseServiceParam,
  type DashboardTab,
} from './dashboardTabs';
import { STORAGE, storage } from '@/lib/storage';
import { useAuth } from '@/contexts/routerProvider/authContext';
import {
  generatePath,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { PET_INPATIENT_LOGS_HASH } from '@/pages/PetProfile/components/inpatientLogsSection';
import { toast } from 'sonner';
import PageTitle from '@/components/common/PageTitle';
import { RowActions } from './components/actionButtons';
import PetVisitsOverview from './components/PetVisitsOverview';
import PetJourneyTab from './components/PetJourneyTab';
import PetService from '@/services/PetService';
import type { Pet, PetStatusFilter } from '@/types';
import PetFormModal from './components/PetFormModal';
import DeletePetModal from './components/DeletePetModal';
import PetDetailModal, {
  calculatePetAge,
  getSpeciesEmoji,
} from './components/PetDetailModal';

const { Text } = Typography;

const DashboardWrapper = styled.div`
  padding: 32px 28px;
  max-width: 1240px;
  margin: 0 auto;

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }
`;

const SectionCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
  margin-bottom: 24px;

  .ant-card-head {
    border-bottom: 1px solid #f1f5f9;
    padding: 0 24px;
    min-height: 52px;
  }

  .ant-card-head-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
  }

  .ant-card-body {
    padding: 20px 24px;
  }
`;

// Appointment list (yêu cầu 17/11): the status tag wraps instead of being cut,
// and the actions start on the left so "Chi tiết" lines up on every row
const StatusCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  .ant-tag {
    margin-inline-end: 0;
    max-width: 100%;
    white-space: normal;
    line-height: 18px;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .status-hint {
    font-size: 12px;
    line-height: 16px;
    color: #64748b;
  }
`;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tabs (file 2): the active one lives in ?tab= so a reload or a link from
  // another page lands on it; ?book= opens the booking form in "Quản lí lịch đặt"
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const activeTab = parseDashboardTab(searchParams.get('tab'));
  const bookParam = searchParams.get('book');
  // ?service= comes from "Đặt dịch vụ này" on a home service card (one id)
  // or from the AI page (the ticked suggestions, ids joined by commas)
  const serviceParam = searchParams.get('service');
  // The AI page sends its booking note along with the booking link
  const bookingNote = (location.state as { bookingNote?: string } | null)
    ?.bookingNote;
  // ?pet= is the pet shown in the "Hành trình của bé" tab
  const journeyPetParam = searchParams.get('pet');
  const [booking, setBooking] = useState<{
    key: number;
    petId?: string;
    note?: string;
    serviceIds?: string[];
  } | null>(null);

  const setTab = useCallback(
    (tab: DashboardTab) =>
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', tab);
          next.delete('book');
          next.delete('service');
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  // The booking wizard is remounted each time, so it starts on the chosen pet
  // (and service)
  const openBooking = useCallback(
    (petId?: string, note?: string, serviceIds?: string[]) => {
      setBooking({ key: Date.now(), petId, note, serviceIds });
      setTab('appointments');
    },
    [setTab]
  );

  useEffect(() => {
    if (bookParam) {
      const serviceIds = parseServiceParam(serviceParam);
      openBooking(
        bookParam === 'new' ? undefined : bookParam,
        bookingNote || undefined,
        serviceIds.length > 0 ? serviceIds : undefined
      );
    }
  }, [bookParam, serviceParam, bookingNote, openBooking]);

  // The AI check was a tab here until 24/11; old ?tab=ai links go to its page
  const legacyAiTab = searchParams.get('tab') === 'ai';
  useEffect(() => {
    if (legacyAiTab) navigate(ROUTER.AI_ASSESSMENT, { replace: true });
  }, [legacyAiTab, navigate]);

  // Opens one pet in the "Hành trình của bé" tab and brings the tabs in view
  const openJourney = useCallback(
    (petId: string) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'journey');
          next.set('pet', petId);
          next.delete('book');
          next.delete('service');
          return next;
        },
        { replace: true }
      );
      document
        .getElementById('dashboard-tabs')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [setSearchParams]
  );

  // Pets state connected to backend API
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsTotal, setPetsTotal] = useState(0);
  const [petsLoading, setPetsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PetStatusFilter>('Active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Bumped after anything that changes a pet's visits (booking, cancelling,
  // adding a service, a pet saved or deleted), so the pet cards reload
  const [visitsRevision, setVisitsRevision] = useState(0);
  const refreshVisits = useCallback(() => setVisitsRevision(n => n + 1), []);

  const [appointments, setAppointments] = useState<OnlineAppointment[]>([]);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null
  );

  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentLimit, setAppointmentLimit] = useState(10);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<
    AppointmentStatus | undefined
  >(undefined);
  const [appointmentFromDate, setAppointmentFromDate] = useState<
    string | undefined
  >(undefined);
  const [appointmentToDate, setAppointmentToDate] = useState<
    string | undefined
  >(undefined);
  // Yêu cầu 24/11: the list opens on today's appointments; the other days
  // (and the date range filter) only when the owner asks for them
  const [appointmentScope, setAppointmentScope] = useState<'today' | 'all'>(
    'today'
  );
  const hasAppointmentFilters = Boolean(
    appointmentStatusFilter ||
      (appointmentScope === 'all' && (appointmentFromDate || appointmentToDate))
  );
  // Today's list without filters: when empty it offers the other days
  const emptyToday = appointmentScope === 'today' && !hasAppointmentFilters;

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);
  const [detailRefreshCount, setDetailRefreshCount] = useState(0);

  const [appointmentToAddService, setAppointmentToAddService] =
    useState<OnlineAppointment | null>(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  // Cancellation State
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<OnlineAppointment | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Safe PetOwner resolution supporting user.role, user.systemRole, and localStorage fallback
  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const isPetOwner = isUserPetOwner(effectiveUser);

  // All pets cached for petId -> Pet name mapping
  const [allPets, setAllPets] = useState<Pet[]>([]);
  useEffect(() => {
    PetService.listPets({ status: 'All', page: 1, limit: 100 })
      .then(res => {
        if (res?.items) setAllPets(res.items);
      })
      .catch(() => {});
  }, []);

  const petsMap = useMemo(() => {
    const map = new Map<string, Pet>();
    for (const p of allPets) map.set(p._id, p);
    for (const p of pets) map.set(p._id, p);
    return map;
  }, [allPets, pets]);

  // File 2: the owner sees who the desk assigned. The list API returns no
  // services, so each appointment on the page is read once from the detail API
  const [staffByAppointment, setStaffByAppointment] = useState<
    Record<string, string[] | null>
  >({});

  useEffect(() => {
    const controller = new AbortController();
    setStaffByAppointment({});
    for (const apt of appointments) {
      if (apt.derivedStatus === 'Cancelled') continue;
      AppointmentOrderService.getMyOnlineBookingById(apt._id, {
        signal: controller.signal,
      })
        .then(res => {
          const names = (res.data?.services || [])
            .map(s => getAppointmentServiceStaffName(s.assignedStaffId))
            .filter(name => name !== '—');
          setStaffByAppointment(prev => ({
            ...prev,
            [apt._id]: [...new Set(names)],
          }));
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setStaffByAppointment(prev => ({ ...prev, [apt._id]: null }));
          }
        });
    }
    return () => controller.abort();
  }, [appointments]);

  const appointmentAbortCtrlRef = useRef<AbortController | null>(null);
  const appointmentReqSeqRef = useRef(0);

  const fetchAppointments = useCallback(async () => {
    // Abort previous in-flight request if any to prevent race condition
    if (appointmentAbortCtrlRef.current) {
      appointmentAbortCtrlRef.current.abort();
    }
    const abortCtrl = new AbortController();
    appointmentAbortCtrlRef.current = abortCtrl;

    const reqSeq = ++appointmentReqSeqRef.current;
    setAppointmentsLoading(true);
    setAppointmentsError(null);

    try {
      const today = getVietnamTodayString();
      const onlyToday = appointmentScope === 'today';
      const res = await AppointmentOrderService.listMyOnlineBookings(
        {
          status: appointmentStatusFilter,
          from: onlyToday ? today : appointmentFromDate,
          to: onlyToday ? today : appointmentToDate,
          page: appointmentPage,
          limit: appointmentLimit,
        },
        { signal: abortCtrl.signal }
      );

      // Only update state if this is still the newest request and not aborted
      if (
        reqSeq === appointmentReqSeqRef.current &&
        !abortCtrl.signal.aborted
      ) {
        setAppointments(res?.data || []);
        setAppointmentsTotal(res?.pagination?.total || 0);
      }
    } catch (err: unknown) {
      // Ignore aborted or stale requests
      if (
        abortCtrl.signal.aborted ||
        reqSeq !== appointmentReqSeqRef.current ||
        (err as any)?.name === 'CanceledError' ||
        (err as any)?.name === 'AbortError' ||
        (err as any)?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      const { message } = extractApiError(
        err,
        'Không thể tải danh sách lịch hẹn khám.'
      );
      setAppointmentsError(message);
      toast.error(message);
    } finally {
      if (
        reqSeq === appointmentReqSeqRef.current &&
        !abortCtrl.signal.aborted
      ) {
        setAppointmentsLoading(false);
      }
    }
  }, [
    appointmentScope,
    appointmentStatusFilter,
    appointmentFromDate,
    appointmentToDate,
    appointmentPage,
    appointmentLimit,
  ]);

  useEffect(() => {
    fetchAppointments();
    return () => {
      if (appointmentAbortCtrlRef.current) {
        appointmentAbortCtrlRef.current.abort();
      }
    };
  }, [fetchAppointments]);

  const handleConfirmCancelAppointment = async (reason: string) => {
    if (!appointmentToCancel || !isPetOwner || cancelSubmitting) return;
    if (!canOwnerCancelAppointment(appointmentToCancel)) {
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      toast.warning(OWNER_CANCEL_DEADLINE_MESSAGE);
      return;
    }
    setCancelSubmitting(true);
    try {
      const res = await AppointmentOrderService.cancelAppointment(
        appointmentToCancel._id,
        { reason }
      );
      toast.success(res.message || 'Đã hủy lịch hẹn thành công');
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      fetchAppointments();
      refreshVisits();
      setDetailRefreshCount(c => c + 1);
    } catch (err: unknown) {
      const errRes = extractApiError(
        err,
        'Không thể hủy lịch hẹn. Vui lòng thử lại.'
      );
      const message = errRes.message;
      const status = errRes.status ?? errRes.statusCode;
      toast.error(message);
      if (status === 409 || status === 404) {
        setIsCancelModalOpen(false);
        setAppointmentToCancel(null);
        fetchAppointments();
        refreshVisits();
        setDetailRefreshCount(c => c + 1);
      }
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Modal controllers
  const [isPetFormModalOpen, setIsPetFormModalOpen] = useState(false);
  const [isPetDetailModalOpen, setIsPetDetailModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

  const fetchPets = useCallback(async () => {
    try {
      setPetsLoading(true);
      const res = await PetService.listPets({
        status: statusFilter,
        page,
        limit,
      });
      setPets(res.items || []);
      setPetsTotal(res.total || 0);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Không thể tải danh sách thú cưng'
      );
    } finally {
      setPetsLoading(false);
    }
  }, [statusFilter, page, limit]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã số: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openPetProfile = (pet: Pet) =>
    navigate(generatePath(ROUTER.PET_PROFILE, { petId: pet._id }));

  // Called by DeletePetModal once the owner has typed the pet's name
  const handleDeletePet = async (pet: Pet) => {
    await PetService.deletePet(pet._id);
    toast.success(`Đã xóa hồ sơ bé ${pet.name}`);
    setPetToDelete(null);
    fetchPets();
    refreshVisits();
  };

  // Appointments table columns
  const appointmentColumns = [
    {
      title: 'Mã lượt hẹn',
      dataIndex: 'code',
      key: 'code',
      width: 128,
      render: (code: string) => (
        <strong
          style={{ color: '#0d9488', letterSpacing: 0.5, whiteSpace: 'nowrap' }}
        >
          {code}
        </strong>
      ),
    },
    {
      title: 'Thú cưng',
      dataIndex: 'petId',
      key: 'petId',
      width: 102,
      render: (petId: string) => {
        const p = petsMap.get(petId);
        if (p) {
          return (
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                Bé {p.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {p.species || 'Thú cưng'} {p.breed ? `· ${p.breed}` : ''}
              </div>
            </div>
          );
        }
        return (
          <Text type="secondary">
            Thú cưng ({petId ? petId.slice(-6) : '—'})
          </Text>
        );
      },
    },
    {
      title: 'Ngày hẹn khám',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string, record: OnlineAppointment) => (
        <div>
          <div>{date ? dayjs(date).format('DD/MM/YYYY') : '—'}</div>
          {record.slotStart && (
            <div style={{ fontSize: 12, color: '#0d9488', fontWeight: 500 }}>
              {record.slotStart}
              {record.slotEnd ? ` - ${record.slotEnd}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Người phụ trách',
      key: 'staff',
      width: 120,
      render: (_: unknown, record: OnlineAppointment) => {
        if (record.derivedStatus === 'Cancelled') {
          return <Text type="secondary">—</Text>;
        }
        const names = staffByAppointment[record._id];
        if (names === undefined) return <Text type="secondary">...</Text>;
        if (names === null) {
          return <Text type="secondary">Không tải được</Text>;
        }
        return names.length > 0 ? (
          <span>{names.join(', ')}</span>
        ) : (
          <Text type="secondary">Chưa phân công</Text>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note?: string) => (
        <Tooltip title={note || undefined}>
          <span>{note || <Text type="secondary">—</Text>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'derivedStatus',
      key: 'derivedStatus',
      width: 140,
      render: (derivedStatus: AppointmentStatus, record: OnlineAppointment) => {
        const tag = (
          <Tag color={getAppointmentStatusColor(derivedStatus)}>
            {getOrderStatusText(record)}
          </Tag>
        );
        return (
          <StatusCell>
            {derivedStatus === 'Cancelled' && record.cancelReason ? (
              <Tooltip title={`Lý do hủy: ${record.cancelReason}`}>
                {tag}
              </Tooltip>
            ) : (
              tag
            )}
            {/* Nghiệp vụ 4.6: the bill is made and paid at the desk on pick-up */}
            {derivedStatus === 'WaitOwner' && (
              <span className="status-hint">Đến đón, thanh toán tại quầy</span>
            )}
          </StatusCell>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 320,
      fixed: 'right' as const,
      render: (_: unknown, record: OnlineAppointment) => {
        const isEligible = isAppointmentEligibleForService(record);
        return (
          <RowActions>
            <Button
              size="small"
              className="act-view"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedAppointmentId(record._id);
                setIsAppointmentDetailOpen(true);
              }}
            >
              Chi tiết
            </Button>
            {isPetOwner && isEligible && (
              <Button
                size="small"
                className="act-add"
                icon={<PlusCircleOutlined />}
                onClick={() => {
                  setAppointmentToAddService(record);
                  setIsAddServiceModalOpen(true);
                }}
              >
                Thêm dịch vụ
              </Button>
            )}
            {isPetOwner && canOwnerCancelAppointment(record) && (
              <Button
                size="small"
                className="act-cancel"
                onClick={() => {
                  if (!canOwnerCancelAppointment(record)) {
                    toast.warning(OWNER_CANCEL_DEADLINE_MESSAGE);
                    return;
                  }
                  setAppointmentToCancel(record);
                  setIsCancelModalOpen(true);
                }}
              >
                Hủy lịch
              </Button>
            )}
            {isPetOwner && getOwnerCancelState(record) === 'disabled' && (
              <Tooltip title={OWNER_CANCEL_DEADLINE_MESSAGE}>
                <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
                  <Button
                    size="small"
                    className="act-cancel"
                    disabled
                    style={{ pointerEvents: 'none' }}
                  >
                    Hủy lịch
                  </Button>
                </span>
              </Tooltip>
            )}
          </RowActions>
        );
      },
    },
  ];

  const petsColumns = [
    {
      title: 'Mã số & Tên thú cưng',
      key: 'name',
      render: (_: any, record: Pet) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {record.photoUrl ? (
            <Avatar
              shape="square"
              size={44}
              src={record.photoUrl}
              style={{
                borderRadius: 8,
                border: '1.5px solid #0d9488',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: '#f0fdfa',
                color: '#0d9488',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ccfbf1',
                flexShrink: 0,
              }}
            >
              {getSpeciesEmoji(record.species)}
            </div>
          )}
          <div>
            <div
              style={{
                fontWeight: 700,
                color: '#0f172a',
                fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={() => openPetProfile(record)}
              title="Mở trang hồ sơ thú cưng"
            >
              🐾 {record.name}
            </div>
            <Tooltip title="Nhấp để sao chép mã số">
              <span
                style={{
                  fontSize: 11.5,
                  color: '#0d9488',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 2,
                }}
                onClick={e => handleCopyCode(e, record.code)}
              >
                Mã: {record.code}
                {copiedCode === record.code ? (
                  <CheckOutlined style={{ color: '#059669', fontSize: 11 }} />
                ) : (
                  <CopyOutlined style={{ fontSize: 11 }} />
                )}
              </span>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: 'Loài & Giống',
      key: 'species',
      render: (_: any, record: Pet) => (
        <div>
          <Tag color="cyan" style={{ marginBottom: 4 }}>
            {record.species || 'Chưa rõ loài'}
          </Tag>
          <div style={{ fontSize: 13, color: '#334155' }}>
            {record.breed || 'Chưa rõ giống'}
          </div>
          {record.coatColor && (
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Màu: {record.coatColor}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tuổi & Thể trọng',
      key: 'weight',
      render: (_: any, record: Pet) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {record.weight !== null && record.weight !== undefined
              ? `${record.weight} kg`
              : 'Chưa cân'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {calculatePetAge(record.dob)}
          </div>
        </div>
      ),
    },
    {
      title: 'Tình trạng y khoa & Cảnh báo',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string | null) =>
        notes ? (
          <span
            style={{
              fontSize: 12.5,
              color: '#b45309',
              background: '#fef3c7',
              padding: '4px 8px',
              borderRadius: 6,
              display: 'inline-block',
              maxWidth: 240,
              lineHeight: 1.4,
            }}
          >
            ⚠️ {notes}
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: '#94a3b8' }}>
            Bình thường / Chưa ghi chú
          </span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'cyan' : 'default'}>
          {status === 'Active' ? 'Đang nuôi' : 'Đã xóa'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác nhanh',
      key: 'action',
      // 24/11: same look as the appointment actions, every button labelled;
      // the main actions on one row, edit and delete on the row below
      render: (_: any, record: Pet) => (
        <RowActions className="stacked">
          <div className="action-row">
            <Button
              size="small"
              className="act-view"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedPet(record);
                setIsPetDetailModalOpen(true);
              }}
            >
              Chi tiết
            </Button>
            {record.status === 'Active' && (
              <Button
                size="small"
                className="act-book"
                icon={<CalendarOutlined />}
                onClick={() => openBooking(record._id)}
              >
                Đặt lịch
              </Button>
            )}
            {isPetOwner && record.status === 'Active' && (
              <Button
                size="small"
                className="act-add"
                icon={<ReadOutlined />}
                aria-label={`Nhật ký nội trú của ${record.name}`}
                title="Nhật ký nội trú"
                onClick={() =>
                  navigate(getJourneyLink(record._id, PET_INPATIENT_LOGS_HASH))
                }
              >
                Nhật ký
              </Button>
            )}
          </div>
          {record.status === 'Active' && (
            <div className="action-row">
              <Button
                size="small"
                className="act-edit"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingPet(record);
                  setIsPetFormModalOpen(true);
                }}
              >
                Sửa
              </Button>
              <Button
                size="small"
                className="act-cancel"
                icon={<DeleteOutlined />}
                aria-label={`Xóa thú cưng ${record.name}`}
                onClick={() => setPetToDelete(record)}
              >
                Xóa
              </Button>
            </div>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <DashboardWrapper>
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <PageTitle>
            Xin chào,{' '}
            {effectiveUser?.fullName || effectiveUser?.phone || 'Quý khách'}!
          </PageTitle>
        </div>
        {/* 24/11: no "Thêm thú cưng" / "Đặt lịch" here; each tab has its own */}
      </div>

      {/* Each pet: its visits of today, else its latest finished visits */}
      <PetVisitsOverview
        revision={visitsRevision}
        onOpenJourney={openJourney}
      />

      {/* File 2: pets, appointments and (24/11) the pets' journeys are tabs;
          the AI check has its own page */}
      <div id="dashboard-tabs" style={{ scrollMarginTop: 80 }}>
        <Tabs
          activeKey={activeTab}
          onChange={key => setTab(key as DashboardTab)}
          items={[
            { key: 'pets', label: 'Quản lí thú cưng' },
            { key: 'appointments', label: 'Quản lí lịch đặt' },
            { key: 'journey', label: 'Hành trình của bé' },
          ]}
        />
      </div>

      {/* Online Appointments Table */}
      {activeTab === 'appointments' && (
        <>
          {booking && (
            <SectionCard
              title="Đặt lịch khám mới"
              extra={
                <Button onClick={() => setBooking(null)}>Đóng form</Button>
              }
            >
              <QuickBookingSection
                key={booking.key}
                embedded
                initialPetId={booking.petId}
                initialNote={booking.note}
                initialServiceIds={booking.serviceIds}
                onBooked={({ date }) => {
                  refreshVisits();
                  if (
                    appointmentScope === 'today' &&
                    date !== getVietnamTodayString()
                  ) {
                    // Booked for another day: list every day so it shows
                    setAppointmentScope('all');
                    setAppointmentPage(1);
                  } else {
                    fetchAppointments();
                  }
                }}
                onViewAppointments={() => setBooking(null)}
                onAddPet={() => {
                  setBooking(null);
                  setTab('pets');
                  setEditingPet(null);
                  setIsPetFormModalOpen(true);
                }}
              />
            </SectionCard>
          )}
          <SectionCard
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>Danh Sách Lịch Hẹn Khám Trực Tuyến</span>
                <Tag color={appointmentsTotal > 0 ? 'cyan' : 'default'}>
                  {appointmentsTotal} lượt hẹn
                  {appointmentScope === 'today' ? ' hôm nay' : ''}
                </Tag>
              </div>
            }
            extra={
              <Space wrap>
                <Button
                  icon={<ReloadOutlined spin={appointmentsLoading} />}
                  onClick={fetchAppointments}
                  title="Làm mới danh sách lịch hẹn"
                />
                <Button
                  type="primary"
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}
                  icon={<CalendarOutlined />}
                  onClick={() => openBooking()}
                >
                  + Đặt lịch khám
                </Button>
              </Space>
            }
          >
            {appointmentsError && (
              <Alert
                type="error"
                showIcon
                message="Không thể tải danh sách lịch hẹn"
                description={appointmentsError}
                action={
                  <Button size="small" onClick={fetchAppointments}>
                    Thử lại
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Filter bar */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <Segmented
                aria-label="Ngày hẹn"
                value={appointmentScope}
                onChange={value => {
                  setAppointmentScope(value as 'today' | 'all');
                  setAppointmentPage(1);
                }}
                options={[
                  { label: 'Hôm nay', value: 'today' },
                  { label: 'Tất cả ngày', value: 'all' },
                ]}
              />

              <Select
                allowClear
                placeholder="Lọc theo trạng thái"
                style={{ minWidth: 200 }}
                value={appointmentStatusFilter}
                onChange={val => {
                  setAppointmentStatusFilter(val || undefined);
                  setAppointmentPage(1);
                }}
                options={[
                  { label: 'Tất cả trạng thái', value: '' },
                  { label: 'Đã đặt (Booked)', value: 'Booked' },
                  { label: 'Đã tiếp nhận (CheckedIn)', value: 'CheckedIn' },
                  { label: 'Đang thực hiện (InProgress)', value: 'InProgress' },
                  { label: 'Chờ chủ đón (WaitOwner)', value: 'WaitOwner' },
                  { label: 'Hoàn tất (Done)', value: 'Done' },
                  { label: 'Đã hủy (Cancelled)', value: 'Cancelled' },
                  { label: 'Quá hạn (Overdue)', value: 'Overdue' },
                ]}
              />

              {appointmentScope === 'all' && (
                <DatePicker.RangePicker
                  format="DD/MM/YYYY"
                  placeholder={['Từ ngày', 'Đến ngày']}
                  value={
                    appointmentFromDate && appointmentToDate
                      ? [dayjs(appointmentFromDate), dayjs(appointmentToDate)]
                      : null
                  }
                  onChange={dates => {
                    if (dates && dates[0] && dates[1]) {
                      setAppointmentFromDate(dates[0].format('YYYY-MM-DD'));
                      setAppointmentToDate(dates[1].format('YYYY-MM-DD'));
                    } else {
                      setAppointmentFromDate(undefined);
                      setAppointmentToDate(undefined);
                    }
                    setAppointmentPage(1);
                  }}
                />
              )}

              {hasAppointmentFilters && (
                <Button
                  type="link"
                  size="small"
                  style={{ color: '#64748b' }}
                  onClick={() => {
                    setAppointmentStatusFilter(undefined);
                    setAppointmentFromDate(undefined);
                    setAppointmentToDate(undefined);
                    setAppointmentPage(1);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            <Table
              rowKey="_id"
              columns={appointmentColumns}
              dataSource={appointments}
              loading={appointmentsLoading}
              scroll={{ x: 1000 }}
              pagination={{
                current: appointmentPage,
                pageSize: appointmentLimit,
                total: appointmentsTotal,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                onChange: (p, ps) => {
                  setAppointmentPage(p);
                  setAppointmentLimit(ps);
                },
                showTotal: total => `Tổng số ${total} lượt hẹn`,
              }}
              size="middle"
              locale={{
                emptyText: (
                  <div style={{ padding: '28px 0', textAlign: 'center' }}>
                    <CalendarOutlined
                      style={{
                        fontSize: 32,
                        color: '#94a3b8',
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: 14,
                      }}
                    >
                      {hasAppointmentFilters
                        ? 'Không tìm thấy lịch hẹn phù hợp với bộ lọc'
                        : emptyToday
                          ? 'Hôm nay chưa có lịch hẹn nào'
                          : 'Chưa có lịch hẹn khám trực tuyến nào'}
                    </div>
                    {/* Booking stays in the card header: no second button here */}
                    {emptyToday && (
                      <Button
                        size="small"
                        onClick={() => {
                          setAppointmentScope('all');
                          setAppointmentPage(1);
                        }}
                      >
                        Xem tất cả ngày
                      </Button>
                    )}
                    {hasAppointmentFilters && (
                      <Button
                        size="small"
                        onClick={() => {
                          setAppointmentStatusFilter(undefined);
                          setAppointmentFromDate(undefined);
                          setAppointmentToDate(undefined);
                          setAppointmentPage(1);
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                ),
              }}
            />
          </SectionCard>
        </>
      )}

      {/* My Pets Table */}
      {activeTab === 'pets' && (
        <SectionCard
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>Hồ Sơ Thú Cưng Của Tôi</span>
              <Tag color="cyan">{petsTotal} hồ sơ</Tag>
            </div>
          }
          extra={
            <Space wrap>
              <Segmented
                value={statusFilter}
                onChange={val => {
                  setStatusFilter(val as PetStatusFilter);
                  setPage(1);
                }}
                options={[
                  { label: 'Đang nuôi (Active)', value: 'Active' },
                  { label: 'Đã xóa (Deleted)', value: 'Deleted' },
                  { label: 'Tất cả (All)', value: 'All' },
                ]}
              />
              <Button
                icon={<ReloadOutlined spin={petsLoading} />}
                onClick={fetchPets}
                title="Làm mới danh sách"
              />
              <Button
                type="primary"
                style={{ background: '#0d9488', borderColor: '#0d9488' }}
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPet(null);
                  setIsPetFormModalOpen(true);
                }}
              >
                Thêm thú cưng
              </Button>
            </Space>
          }
        >
          <Table
            columns={petsColumns}
            dataSource={pets}
            rowKey="_id"
            loading={petsLoading}
            pagination={{
              current: page,
              pageSize: limit,
              total: petsTotal,
              onChange: (p, l) => {
                setPage(p);
                setLimit(l);
              },
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
            }}
            size="middle"
            locale={{
              emptyText: (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
                  <div
                    style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}
                  >
                    {statusFilter === 'Deleted'
                      ? 'Không có thú cưng nào đã xóa'
                      : 'Bạn chưa có hồ sơ thú cưng nào'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#64748b',
                      marginTop: 4,
                      marginBottom: 16,
                    }}
                  >
                    Đăng ký thông tin thú cưng để theo dõi lịch tiêm phòng, bệnh
                    án điện tử và đặt hẹn ưu tiên
                  </div>
                  {statusFilter !== 'Deleted' && (
                    <Button
                      type="primary"
                      style={{ background: '#0d9488', borderColor: '#0d9488' }}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingPet(null);
                        setIsPetFormModalOpen(true);
                      }}
                    >
                      + Đăng ký thú cưng đầu tiên
                    </Button>
                  )}
                </div>
              ),
            }}
          />
        </SectionCard>
      )}

      {/* Pick a pet, read its journey right below (24/11) */}
      {activeTab === 'journey' && (
        <PetJourneyTab
          petId={journeyPetParam}
          revision={visitsRevision}
          onSelectPet={openJourney}
          onAddPet={() => {
            setEditingPet(null);
            setIsPetFormModalOpen(true);
          }}
        />
      )}

      {/* Pet Create/Edit Modal */}
      <PetFormModal
        open={isPetFormModalOpen}
        onCancel={() => {
          setIsPetFormModalOpen(false);
          setEditingPet(null);
        }}
        onSuccess={() => {
          fetchPets();
          refreshVisits();
        }}
        editingPet={editingPet}
      />

      {/* Pet Detail Modal */}
      <PetDetailModal
        open={isPetDetailModalOpen}
        onCancel={() => {
          setIsPetDetailModalOpen(false);
          setSelectedPet(null);
        }}
        pet={selectedPet}
        onEdit={pet => {
          setEditingPet(pet);
          setIsPetFormModalOpen(true);
        }}
        onDelete={pet => setPetToDelete(pet)}
        onBookAppointment={pet => {
          setIsPetDetailModalOpen(false);
          setSelectedPet(null);
          openBooking(pet._id);
        }}
        onOpenProfile={openPetProfile}
      />

      {/* Pet Delete Confirmation (type the pet's name) */}
      <DeletePetModal
        pet={petToDelete}
        onCancel={() => setPetToDelete(null)}
        onConfirm={handleDeletePet}
      />

      {/* Online Appointment Detail Modal */}
      <AppointmentDetailModal
        open={isAppointmentDetailOpen}
        appointmentId={selectedAppointmentId}
        onClose={() => {
          setIsAppointmentDetailOpen(false);
          setSelectedAppointmentId(null);
        }}
        petsMap={petsMap}
        isPetOwner={isPetOwner}
        refreshTrigger={detailRefreshCount}
        onUpdated={() => {
          fetchAppointments();
          refreshVisits();
        }}
        onAddService={apt => {
          setAppointmentToAddService(apt);
          setIsAddServiceModalOpen(true);
        }}
      />

      {/* Cancel Whole Appointment Modal (from Table action) */}
      {appointmentToCancel && (
        <CancelReasonModal
          open={isCancelModalOpen}
          title="Hủy lịch hẹn trực tuyến"
          warningText="Bạn đang thực hiện hủy toàn bộ lịch hẹn này. Mọi dịch vụ chưa thực hiện thuộc lịch hẹn cũng sẽ bị hủy."
          targetDescription={
            <div>
              Mã lịch hẹn: <strong>{appointmentToCancel.code}</strong> (Ngày{' '}
              {dayjs(appointmentToCancel.date).format('DD/MM/YYYY')}
              {appointmentToCancel.slotStart
                ? ` - ${appointmentToCancel.slotStart}`
                : ''}
              )
            </div>
          }
          confirmLoading={cancelSubmitting}
          onCancel={() => {
            setIsCancelModalOpen(false);
            setAppointmentToCancel(null);
          }}
          onConfirm={handleConfirmCancelAppointment}
        />
      )}

      {/* Add Service to Online Appointment Modal */}
      <AddAppointmentServiceModal
        open={isAddServiceModalOpen}
        appointment={appointmentToAddService}
        pet={
          appointmentToAddService
            ? petsMap.get(appointmentToAddService.petId)
            : undefined
        }
        onClose={() => {
          setIsAddServiceModalOpen(false);
          setAppointmentToAddService(null);
        }}
        onSuccess={() => {
          // Re-fetch appointments to refresh table state and detail modal
          fetchAppointments();
          refreshVisits();
          setDetailRefreshCount(c => c + 1);
        }}
      />
    </DashboardWrapper>
  );
};

export default DashboardPage;
