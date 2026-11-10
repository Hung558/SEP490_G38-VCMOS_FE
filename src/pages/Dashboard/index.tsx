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
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
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
  MedicineBoxOutlined,
  HeartOutlined,
  CheckCircleOutlined,
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
  getAppointmentStatusLabel,
  getAppointmentStatusColor,
  extractApiError,
} from '@/services/AppointmentOrderService';
import type { OnlineAppointment, AppointmentStatus } from '@/types';
import AppointmentDetailModal from './components/AppointmentDetailModal';
import AddAppointmentServiceModal from './components/AddAppointmentServiceModal';
import {
  isAppointmentEligibleForService,
  isUserPetOwner,
  getAppointmentServiceStaffName,
} from '@/services/AppointmentServiceService';
import QuickBookingSection from '@/pages/Home/components/QuickBookingSection';
import { parseDashboardTab, type DashboardTab } from './dashboardTabs';
import { STORAGE, storage } from '@/lib/storage';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { toast } from 'sonner';
import AiAssessmentSection from './components/AiAssessmentSection';
import PetService from '@/services/PetService';
import type { Pet, PetStatusFilter } from '@/types';
import PetFormModal from './components/PetFormModal';
import DeletePetModal from './components/DeletePetModal';
import PetDetailModal, {
  calculatePetAge,
  getSpeciesEmoji,
} from './components/PetDetailModal';

const { Title, Text } = Typography;

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

    .header-actions {
      display: flex;
      gap: 12px;

      .btn-add-pet {
        border-color: #cbd5e1;
        color: #334155;
        font-weight: 600;
        height: 40px;
        border-radius: 8px;
      }

      .btn-new-appt {
        background-color: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
        font-weight: 600;
        height: 40px;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        &:hover {
          background-color: #0f766e !important;
          border-color: #0f766e !important;
        }
      }
    }
  }
`;

// Inpatient Stay Progress Banner
const InpatientBanner = styled.div`
  background: #f0fdfa;
  border: 1.5px solid #99f6e4;
  border-radius: 12px;
  padding: 18px 24px;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .banner-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #0d9488;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .info {
      .tag-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;

        .badge-pulse {
          font-size: 11.5px;
          font-weight: 700;
          color: #0f766e;
          background: #ccfbf1;
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .title {
        font-size: 15px;
        font-weight: 750;
        color: #0f172a;
        margin-bottom: 2px;
      }

      .sub {
        font-size: 13px;
        color: #475569;
      }
    }
  }

  .btn-view-progress {
    background: #0d9488;
    color: #ffffff;
    border: none;
    height: 38px;
    padding: 0 18px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;

    &:hover {
      background: #0f766e;
    }
  }
`;

const StatCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
  transition: all 0.2s;

  &:hover {
    border-color: #ccfbf1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .ant-card-body {
    padding: 20px 22px;
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }

    .icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;

      &.teal {
        background: #f0fdfa;
        color: #0d9488;
      }
      &.blue {
        background: #f0f9ff;
        color: #0284c7;
      }
      &.amber {
        background: #fffbeb;
        color: #d97706;
      }
      &.green {
        background: #f0fdf4;
        color: #16a34a;
      }
    }
  }

  .num {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }

  .sub {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInpatientModalOpen, setIsInpatientModalOpen] = useState(false);

  // Tabs (file 2): the active one lives in ?tab= so a reload or a link from
  // another page lands on it; ?book= opens the booking form in "Quản lí lịch đặt"
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseDashboardTab(searchParams.get('tab'));
  const bookParam = searchParams.get('book');
  const [booking, setBooking] = useState<{
    key: number;
    petId?: string;
    note?: string;
  } | null>(null);

  const setTab = useCallback(
    (tab: DashboardTab) =>
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', tab);
          next.delete('book');
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  // The booking wizard is remounted each time, so it starts on the chosen pet
  const openBooking = useCallback(
    (petId?: string, note?: string) => {
      setBooking({ key: Date.now(), petId, note });
      setTab('appointments');
    },
    [setTab]
  );

  useEffect(() => {
    if (bookParam) openBooking(bookParam === 'new' ? undefined : bookParam);
  }, [bookParam, openBooking]);

  // Pets state connected to backend API
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsTotal, setPetsTotal] = useState(0);
  const [petsLoading, setPetsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PetStatusFilter>('Active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dynamic appointments and inpatient data
  const [inpatientStay] = useState<any | null>(null);

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

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);
  const [detailRefreshCount, setDetailRefreshCount] = useState(0);

  const [appointmentToAddService, setAppointmentToAddService] =
    useState<OnlineAppointment | null>(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

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
      const res = await AppointmentOrderService.listMyOnlineBookings(
        {
          status: appointmentStatusFilter,
          from: appointmentFromDate,
          to: appointmentToDate,
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
    try {
      await PetService.deletePet(pet._id);
      toast.success(`Đã xóa hồ sơ bé ${pet.name}`);
      setPetToDelete(null);
      fetchPets();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Không thể xóa hồ sơ thú cưng'
      );
    }
  };

  // Appointments table columns
  const appointmentColumns = [
    {
      title: 'Mã lượt hẹn',
      dataIndex: 'code',
      key: 'code',
      width: 115,
      render: (code: string) => (
        <strong style={{ color: '#0d9488', letterSpacing: 0.5 }}>{code}</strong>
      ),
    },
    {
      title: 'Thú cưng',
      dataIndex: 'petId',
      key: 'petId',
      width: 130,
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
      render: (date: string) => (
        <span>{date ? dayjs(date).format('DD/MM/YYYY') : '—'}</span>
      ),
    },
    {
      title: 'Người phụ trách',
      key: 'staff',
      width: 150,
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
      width: 110,
      render: (derivedStatus: AppointmentStatus) => (
        <Tag color={getAppointmentStatusColor(derivedStatus)}>
          {getAppointmentStatusLabel(derivedStatus)}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, record: OnlineAppointment) => {
        const isEligible = isAppointmentEligibleForService(record);
        return (
          <Space
            size={2}
            style={{
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              style={{
                color: '#0d9488',
                fontWeight: 600,
                padding: '2px 4px',
                height: 'auto',
                lineHeight: 1.4,
              }}
              onClick={() => {
                setSelectedAppointmentId(record._id);
                setIsAppointmentDetailOpen(true);
              }}
            >
              Chi tiết
            </Button>
            {isPetOwner && isEligible && (
              <Button
                type="link"
                size="small"
                icon={<PlusCircleOutlined />}
                style={{
                  color: '#0284c7',
                  fontWeight: 600,
                  padding: '2px 4px',
                  height: 'auto',
                  lineHeight: 1.4,
                }}
                onClick={() => {
                  setAppointmentToAddService(record);
                  setIsAddServiceModalOpen(true);
                }}
              >
                Thêm dịch vụ
              </Button>
            )}
          </Space>
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
      render: (_: any, record: Pet) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            style={{ borderColor: '#0d9488', color: '#0d9488' }}
            onClick={() => {
              setSelectedPet(record);
              setIsPetDetailModalOpen(true);
            }}
            title="Xem chi tiết hồ sơ y bạ"
          >
            Chi tiết
          </Button>

          {record.status === 'Active' && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingPet(record);
                setIsPetFormModalOpen(true);
              }}
              title="Chỉnh sửa thông tin"
            />
          )}

          {record.status === 'Active' && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Xóa thú cưng"
              aria-label={`Xóa thú cưng ${record.name}`}
              onClick={() => setPetToDelete(record)}
            />
          )}

          {record.status === 'Active' && (
            <Button
              size="small"
              type="primary"
              style={{ background: '#0d9488' }}
              icon={<CalendarOutlined />}
              onClick={() => openBooking(record._id)}
              title="Đặt lịch khám"
            >
              Đặt lịch
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <DashboardWrapper>
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <Title
            level={3}
            style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}
          >
            Xin chào,{' '}
            {effectiveUser?.fullName || effectiveUser?.phone || 'Quý khách'}!
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Bảng theo dõi sức khoẻ thú cưng & quản lý chu trình khám chữa bệnh
            tại VCMOS
          </Text>
        </div>

        <div className="header-actions">
          <Button
            className="btn-add-pet"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPet(null);
              setIsPetFormModalOpen(true);
            }}
          >
            Thêm thú cưng
          </Button>
          <Button
            type="primary"
            className="btn-new-appt"
            icon={<CalendarOutlined />}
            onClick={() => openBooking()}
          >
            + Đặt lịch hẹn mới
          </Button>
        </div>
      </div>

      {/* Inpatient Stay Banner - Only shown when there is an active inpatient pet */}
      {inpatientStay && (
        <InpatientBanner>
          <div className="banner-left">
            <div className="icon-wrap">
              <HeartOutlined />
            </div>
            <div className="info">
              <div className="tag-row">
                <span className="badge-pulse">LƯU CHUỒNG ĐIỀU TRỊ NỘI TRÚ</span>
                <Tag color="cyan">
                  {inpatientStay.room || 'Chuồng C-01'} (Occupied)
                </Tag>
              </div>
              <div className="title">
                Bé {inpatientStay.petName || 'Thú cưng'} đang được theo dõi điều
                trị nội trú (Ngày thứ {inpatientStay.days || 1})
              </div>
              <div className="sub">
                Bác sĩ điều trị:{' '}
                <strong>{inpatientStay.doctor || 'Bác sĩ trực'}</strong> · Chẩn
                đoán: {inpatientStay.diagnosis || 'Đang theo dõi'} · Sinh hiệu:{' '}
                {inpatientStay.vitals || 'Ổn định'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-view-progress"
            onClick={() => setIsInpatientModalOpen(true)}
          >
            <EyeOutlined /> Theo dõi nhật ký lâm sàng từ xa
          </button>
        </InpatientBanner>
      )}

      {/* Stats Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Thú cưng đã đăng ký</span>
              <div className="icon-box teal">
                <MedicineBoxOutlined />
              </div>
            </div>
            <div className="num">{petsTotal}</div>
            <div className="sub">
              {pets.length > 0
                ? pets
                    .slice(0, 2)
                    .map(p => `Bé ${p.name}`)
                    .join(' & ') +
                  (petsTotal > 2 ? ` và ${petsTotal - 2} bé khác` : '')
                : 'Chưa có hồ sơ thú cưng'}
            </div>
          </StatCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Lịch hẹn trực tuyến</span>
              <div className="icon-box blue">
                <CalendarOutlined />
              </div>
            </div>
            <div className="num">{appointmentsTotal}</div>
            <div className="sub">
              {appointmentsTotal > 0
                ? `${appointmentsTotal} lượt hẹn trên hệ thống`
                : 'Chưa có lịch hẹn trực tuyến'}
            </div>
          </StatCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Đang nằm viện nội trú</span>
              <div className="icon-box amber">
                <HeartOutlined />
              </div>
            </div>
            <div className="num">{inpatientStay ? 1 : 0}</div>
            <div className="sub">
              {inpatientStay
                ? `${inpatientStay.room} (Ngày ${inpatientStay.days})`
                : 'Không có thú cưng lưu chuồng'}
            </div>
          </StatCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Lịch hiển thị hiện tại</span>
              <div className="icon-box green">
                <CheckCircleOutlined />
              </div>
            </div>
            <div className="num">{appointments.length}</div>
            <div className="sub">
              {appointments.length > 0
                ? `${appointments.length} lượt hẹn theo trang lọc`
                : 'Không có dữ liệu trang này'}
            </div>
          </StatCard>
        </Col>
      </Row>

      {/* File 2: pets, appointments and the AI check are separate tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={key => setTab(key as DashboardTab)}
        items={[
          { key: 'pets', label: '🐾 Quản lí thú cưng' },
          { key: 'appointments', label: '📅 Quản lí lịch đặt' },
          { key: 'ai', label: '🤖 Tính năng AI' },
        ]}
      />

      {/* Online Appointments Table */}
      {activeTab === 'appointments' && (
        <>
          {booking && (
            <SectionCard
              title={<span>📝 Đặt lịch khám mới</span>}
              extra={
                <Button onClick={() => setBooking(null)}>Đóng form</Button>
              }
            >
              <QuickBookingSection
                key={booking.key}
                embedded
                initialPetId={booking.petId}
                initialNote={booking.note}
                onBooked={fetchAppointments}
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
                <span>📅 Danh Sách Lịch Hẹn Khám Trực Tuyến</span>
                <Tag color={appointmentsTotal > 0 ? 'cyan' : 'default'}>
                  {appointmentsTotal} lượt hẹn
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

              {(appointmentStatusFilter ||
                appointmentFromDate ||
                appointmentToDate) && (
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
              scroll={{ x: 780 }}
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
                      }}
                    >
                      {appointmentStatusFilter ||
                      appointmentFromDate ||
                      appointmentToDate
                        ? 'Không tìm thấy lịch hẹn phù hợp với bộ lọc'
                        : 'Chưa có lịch hẹn khám trực tuyến nào'}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: '#64748b',
                        marginTop: 4,
                        marginBottom: 14,
                      }}
                    >
                      {appointmentStatusFilter ||
                      appointmentFromDate ||
                      appointmentToDate
                        ? 'Hãy thử thay đổi hoặc xóa bộ lọc trạng thái và khoảng ngày'
                        : 'Đăng ký ngày hẹn và ghi chú triệu chứng cho thú cưng dễ dàng trực tuyến'}
                    </div>
                    {appointmentStatusFilter ||
                    appointmentFromDate ||
                    appointmentToDate ? (
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
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        style={{ background: '#0d9488' }}
                        icon={<CalendarOutlined />}
                        onClick={() => openBooking()}
                      >
                        + Đặt lịch khám ngay
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
              <span>🐾 Hồ Sơ Thú Cưng Của Tôi</span>
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

      {/* Sàng Lọc & Đánh Giá Triệu Chứng Thú Cưng Ban Đầu (Đang phát triển) */}
      {activeTab === 'ai' && (
        <AiAssessmentSection
          isUnderDevelopment={true}
          userPets={pets}
          onAddNewPet={() => {
            setEditingPet(null);
            setIsPetFormModalOpen(true);
          }}
          onBookAppointment={notes => {
            openBooking(undefined, notes || undefined);
            if (notes) {
              toast.info(
                'Đã chuyển tiếp thông tin triệu chứng sang luồng đặt lịch khám!'
              );
            }
          }}
        />
      )}

      {/* Inpatient Modal Detail */}
      <Modal
        title="Nhật Ký Điều Trị Nội Trú Thú Cưng Từ Xa"
        open={isInpatientModalOpen}
        onCancel={() => setIsInpatientModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsInpatientModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="call"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => {
              window.location.href = 'tel:02473008888';
            }}
          >
            Gọi hotline phòng khám (024) 7300 8888
          </Button>,
        ]}
        width={720}
      >
        <div style={{ padding: '12px 0' }}>
          <div
            style={{
              background: '#f8fafc',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                fontSize: 13.5,
              }}
            >
              <div>
                Thú cưng: <strong>Bé Milo (Chó Poodle · 5.2 kg)</strong>
              </div>
              <div>
                Vị trí: <strong>Lồng nội trú C-01</strong>
              </div>
              <div>
                Bác sĩ điều trị: <strong>BS. Trần Thị B (USR-000002)</strong>
              </div>
              <div>
                Chẩn đoán ban đầu: <strong>Viêm dạ dày ruột cấp tính</strong>
              </div>
            </div>
          </div>

          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
            Nhật ký lâm sàng hàng ngày (Daily Rounds):
          </div>

          <div
            style={{
              borderLeft: '3px solid #0d9488',
              paddingLeft: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              Hôm nay (25/10/2026 - Ngày 2) - Ghi nhận lúc 11:30
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
              • Thân nhiệt: 38.6°C (Bình thường), nhịp thở đều, mắt linh hoạt.
              <br />
              • Dinh dưỡng: Đã tự ăn được 50g cháo dinh dưỡng chuyên dụng, không
              còn nôn ói.
              <br />• Dùng thuốc: Tiêm kháng sinh Amoxicillin liều ngày 2,
              truyền dịch Glucose 5%.
            </div>
          </div>

          <div style={{ borderLeft: '3px solid #cbd5e1', paddingLeft: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
              Hôm qua (24/10/2026 - Ngày 1) - Tiếp nhận cấp cứu
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              • Thân nhiệt: 39.5°C (Sốt nhẹ), mất nước thể nhẹ.
              <br />• Tiến hành hạ sốt, cách ly theo dõi tại Chuồng C-01.
            </div>
          </div>
        </div>
      </Modal>

      {/* Pet Create/Edit Modal */}
      <PetFormModal
        open={isPetFormModalOpen}
        onCancel={() => {
          setIsPetFormModalOpen(false);
          setEditingPet(null);
        }}
        onSuccess={() => fetchPets()}
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
        onAddService={apt => {
          setAppointmentToAddService(apt);
          setIsAddServiceModalOpen(true);
        }}
      />

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
          setDetailRefreshCount(c => c + 1);
        }}
      />
    </DashboardWrapper>
  );
};

export default DashboardPage;
