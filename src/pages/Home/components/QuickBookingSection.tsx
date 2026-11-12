import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import styled from 'styled-components';
import { Button, Input, Select, DatePicker, Alert, Spin, Tag } from 'antd';
import {
  CheckCircleOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  PlusOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { STORAGE, storage } from '@/lib/storage';
import PetService from '@/services/PetService';
import ServiceService, { formatServicePrice } from '@/services/ServiceService';
import type { Service } from '@/services/ServiceService';
import AppointmentServiceService, {
  isUserPetOwner,
  extractApiError,
  validateOnlineBookingForm,
  getAppointmentServiceStatusColor,
  getAppointmentServiceStatusLabel,
  getAppointmentServiceName,
  filterActiveServices,
  getVietnamTodayString,
  getBookingServiceDuration,
  getClinicBookingSlots,
  getEstimatedBookingEnd,
  validateSlotStart,
} from '@/services/AppointmentServiceService';
import type { Pet, OnlineAppointment, OnlineAppointmentService } from '@/types';
import ROUTER from '@/routerMap/ROUTER';
import BookingServiceStep, {
  type SelectedBookingService,
} from './BookingServiceStep';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 64px 24px 80px 24px;
`;

const BookingCard = styled.div`
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  padding: 44px;
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 48px;
  align-items: flex-start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 28px 18px;
    gap: 32px;
  }
`;

// Inside the dashboard tab: unified form only, no marketing column or card frame
const EmbeddedWrapper = styled.div``;

const EmbeddedBookingCard = styled(BookingCard)`
  grid-template-columns: 1fr;
  padding: 0;
  border: none;
  box-shadow: none;

  @media (max-width: 960px) {
    padding: 0;
  }
`;

const GuestNotice = styled.div`
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
  color: #0f766e;

  .btn-guest-login {
    background: #0d9488;
    color: #ffffff;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover {
      background: #0f766e;
    }
  }
`;

const LeftInfo = styled.div`
  .booking-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    color: #0f766e;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 34px;
    font-weight: 850;
    color: #0f172a;
    line-height: 1.25;
    margin: 0 0 16px 0;
    letter-spacing: -0.02em;

    @media (max-width: 640px) {
      font-size: 26px;
    }
  }

  p.desc {
    font-size: 15px;
    color: #64748b;
    line-height: 1.6;
    margin: 0 0 28px 0;
  }

  .benefits-list {
    list-style: none;
    padding: 0;
    margin: 0 0 32px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;

    li {
      display: flex;
      align-items: flex-start;
      gap: 12px;

      .icon-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #f0fdfa;
        color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .text {
        strong {
          display: block;
          font-size: 14px;
          color: #0f172a;
          margin-bottom: 2px;
        }
        span {
          font-size: 13px;
          color: #64748b;
        }
      }
    }
  }

  .hotline-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 14px;

    .phone-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0d9488;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .info {
      .label {
        font-size: 12px;
        color: #64748b;
      }
      .phone-num {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }
    }
  }
`;

const FormWrap = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 28px;

  @media (max-width: 640px) {
    padding: 18px 14px;
  }

  .form-section-block {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

    @media (max-width: 640px) {
      padding: 16px 12px;
    }
  }

  .section-label {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: 4px;
    margin-bottom: 8px;
  }

  .grid-two-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  .booking-summary-strip {
    background: #f0fdfa;
    border: 1px dashed #0d9488;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .summary-items {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 13.5px;
      color: #334155;

      strong {
        color: #0f172a;
      }
    }

    .summary-total {
      font-size: 14px;
      font-weight: 700;
      color: #0d9488;
    }
  }

  .form-submit-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 8px;

    .note-text {
      font-size: 13px;
      color: #64748b;
    }

    .btn-submit {
      background: #0d9488;
      border-color: #0d9488;
      color: #ffffff;
      height: 46px;
      padding: 0 28px;
      font-weight: 700;
      font-size: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);

      &:hover:not(:disabled) {
        background: #0f766e !important;
        border-color: #0f766e !important;
      }
    }
  }
`;

const SuccessCard = styled.div`
  text-align: center;
  padding: 16px 8px;

  .success-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ecfdf5;
    color: #059669;
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  h3 {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
  }

  p.subtext {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
  }

  .appointment-code-box {
    background: #f0fdfa;
    border: 1.5px dashed #0d9488;
    border-radius: 10px;
    padding: 16px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-bottom: 24px;
    min-width: 280px;

    .code-label {
      font-size: 12px;
      font-weight: 600;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .code-val {
      font-size: 24px;
      font-weight: 850;
      color: #0d9488;
      letter-spacing: 1px;
    }
  }

  .detail-summary {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 24px;
    text-align: left;
    font-size: 13.5px;

    .row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      color: #334155;
    }
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
`;

interface CreatedBookingData {
  appointment: OnlineAppointment;
  services: OnlineAppointmentService[];
}

interface QuickBookingSectionProps {
  /**
   * Inside the "Quản lí lịch đặt" tab of the owner dashboard: no marketing
   * column, and the links that would open the dashboard call back instead
   */
  embedded?: boolean;
  /** Pet chosen when the form opens (from "Đặt lịch" on a pet) */
  initialPetId?: string;
  /** Note filled in when the form opens (symptoms from the AI section) */
  initialNote?: string;
  /** A booking was created: the dashboard reloads its appointment list */
  onBooked?: () => void;
  onViewAppointments?: () => void;
  onAddPet?: () => void;
}

const QuickBookingSection: React.FC<QuickBookingSectionProps> = ({
  embedded = false,
  initialPetId,
  initialNote,
  onBooked,
  onViewAppointments,
  onAddPet,
}) => {
  const navigate = useNavigate();
  const goToDashboard = () =>
    embedded && onViewAppointments
      ? onViewAppointments()
      : navigate(ROUTER.DASHBOARD);
  const goToAddPet = () =>
    embedded && onAddPet ? onAddPet() : navigate(ROUTER.DASHBOARD);
  const { isLogin } = useIsLogin();
  const { user } = useAuth();

  const storedUser = storage.getLocalStorage<any>(STORAGE.USER_INFO);
  const effectiveUser =
    user || (storedUser && typeof storedUser === 'object' ? storedUser : null);
  const isOwner = isUserPetOwner(effectiveUser);

  // Pets state
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');

  // Active Services state
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<
    SelectedBookingService[]
  >([]);

  // Date & Slot & Note state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string>('');
  const [bookingNote, setBookingNote] = useState(initialNote || '');

  const [bookingClock, setBookingClock] = useState(() => new Date());
  const dateStr = selectedDate?.format('YYYY-MM-DD') ?? '';

  // Keep availability current while the form is open; submit rechecks with a fresh clock.
  useEffect(() => {
    if (!dateStr) return;
    const timer = window.setInterval(() => setBookingClock(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, [dateStr]);

  // Validation / Error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [createdBookingData, setCreatedBookingData] =
    useState<CreatedBookingData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load active pets for logged-in PetOwner
  useEffect(() => {
    let isMounted = true;
    if (!isLogin || !isOwner) {
      setPets([]);
      setSelectedPetId('');
      return;
    }

    const loadPets = async () => {
      try {
        setPetsLoading(true);
        setPetsError(null);
        const res = await PetService.listPets({
          status: 'Active',
          page: 1,
          limit: 100,
        });
        if (isMounted) {
          const items = res?.items || [];
          setPets(items);
          if (items.length > 0) {
            // The pet the owner clicked "Đặt lịch" on, when it is still active
            const preferred = items.find(p => p._id === initialPetId);
            setSelectedPetId(prev => prev || (preferred || items[0])._id);
          }
        }
      } catch {
        if (isMounted) {
          setPetsError('Không thể tải danh sách thú cưng. Vui lòng thử lại.');
        }
      } finally {
        if (isMounted) {
          setPetsLoading(false);
        }
      }
    };

    loadPets();
    return () => {
      isMounted = false;
    };
  }, [isLogin, isOwner, initialPetId]);

  // Refs to prevent race conditions and manage abort controller across retries
  const servicesAbortCtrlRef = useRef<AbortController | null>(null);
  const servicesReqSeqRef = useRef(0);

  // Load active services with abort controller and sequence guard
  const loadActiveServices = useCallback(async () => {
    // Abort previous in-flight request if any to prevent race condition
    if (servicesAbortCtrlRef.current) {
      servicesAbortCtrlRef.current.abort();
    }
    const abortCtrl = new AbortController();
    servicesAbortCtrlRef.current = abortCtrl;

    const reqSeq = ++servicesReqSeqRef.current;
    setServicesLoading(true);
    setServicesError(null);

    try {
      const res = await ServiceService.listServices(
        { status: 'Active' },
        { signal: abortCtrl.signal }
      );

      // Only update state if this is still the newest request and not aborted
      if (reqSeq === servicesReqSeqRef.current && !abortCtrl.signal.aborted) {
        // Double-check active filter against stale or cached data
        const items = filterActiveServices(res?.services);
        setActiveServices(items);
      }
    } catch (err: unknown) {
      // Ignore aborted or stale requests
      if (
        abortCtrl.signal.aborted ||
        reqSeq !== servicesReqSeqRef.current ||
        (err as any)?.name === 'CanceledError' ||
        (err as any)?.name === 'AbortError' ||
        (err as any)?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setServicesError('Không thể tải danh sách dịch vụ. Vui lòng thử lại.');
    } finally {
      if (reqSeq === servicesReqSeqRef.current && !abortCtrl.signal.aborted) {
        setServicesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadActiveServices();
    return () => {
      if (servicesAbortCtrlRef.current) {
        servicesAbortCtrlRef.current.abort();
      }
    };
  }, [loadActiveServices]);

  // Disable past dates according to Vietnam date semantics
  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    const todayStr = getVietnamTodayString();
    return current.isBefore(dayjs(todayStr), 'day');
  };

  const selectedPet = pets.find(p => p._id === selectedPetId);

  // Active services map for quick lookup
  const activeServicesMap = useMemo(
    () => new Map<string, Service>(activeServices.map(s => [s._id, s])),
    [activeServices]
  );

  // Total price of selected services
  const totalSelectedPrice = useMemo(() => {
    return selectedServices.reduce((sum, item) => {
      const s = activeServicesMap.get(item.serviceId);
      return sum + (s?.basePrice || 0);
    }, 0);
  }, [selectedServices, activeServicesMap]);

  const totalDuration = selectedServices.reduce(
    (sum, item) =>
      sum +
      getBookingServiceDuration(
        activeServicesMap.get(item.serviceId)?.defaultDuration
      ),
    0
  );
  const clinicSlotOptions = useMemo(
    () => getClinicBookingSlots(dateStr, totalDuration, bookingClock),
    [dateStr, totalDuration, bookingClock]
  );
  const slotError =
    (dateStr &&
      validateSlotStart(selectedSlotStart, dateStr, {
        totalDuration,
        now: bookingClock,
      })) ||
    fieldErrors.slotStart;
  const estimatedEnd =
    dateStr && !slotError
      ? getEstimatedBookingEnd(selectedSlotStart, totalDuration)
      : undefined;

  // Submit combined online booking in a single request with full client-side validation
  const handleSubmitBooking = async () => {
    if (submitting) return;

    if (!isLogin) {
      toast.info('Vui lòng đăng nhập tài khoản chủ nuôi để đặt lịch hẹn!');
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }

    if (!isOwner) {
      toast.error('Tài khoản hiện tại không có quyền đặt lịch hẹn online.');
      return;
    }

    if (petsError) {
      toast.error(
        'Không thể tải danh sách thú cưng. Vui lòng bấm Thử lại hoặc làm mới trang.'
      );
      return;
    }

    if (pets.length === 0) {
      toast.info(
        'Bạn chưa có hồ sơ thú cưng nào. Vui lòng thêm thú cưng trong Dashboard trước khi đặt lịch.'
      );
      setFieldErrors(prev => ({
        ...prev,
        petId:
          'Vui lòng thêm hồ sơ thú cưng trong Dashboard trước khi tiếp tục',
      }));
      return;
    }

    const trimmedSlot = selectedSlotStart.trim();
    const validation = validateOnlineBookingForm(
      {
        petId: selectedPetId,
        date: dateStr,
        slotStart: trimmedSlot,
        note: bookingNote,
        services: selectedServices.map((s, idx) => ({
          serviceId: s.serviceId,
          sequenceNo: s.sequenceNo || idx + 1,
          isEmergency: s.isEmergency,
        })),
      },
      { totalDuration }
    );

    if (!validation.isValid) {
      setFieldErrors({
        ...(validation.errors.petId ? { petId: validation.errors.petId } : {}),
        ...(validation.errors.date ? { date: validation.errors.date } : {}),
        ...(validation.errors.slotStart
          ? { slotStart: validation.errors.slotStart }
          : {}),
        ...(validation.errors.note ? { note: validation.errors.note } : {}),
        ...(validation.errors.services
          ? { services: validation.errors.services }
          : {}),
      });
      toast.error(
        validation.errors.petId ||
          validation.errors.services ||
          validation.errors.date ||
          validation.errors.slotStart ||
          validation.errors.note ||
          'Thông tin chưa hợp lệ'
      );
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await AppointmentServiceService.createOnlineBooking({
        petId: selectedPetId,
        date: dateStr,
        slotStart: trimmedSlot,
        note: bookingNote.trim() ? bookingNote.trim() : undefined,
        services: selectedServices.map((s, idx) => ({
          serviceId: s.serviceId,
          sequenceNo: s.sequenceNo || idx + 1,
          isEmergency: Boolean(s.isEmergency),
        })),
      });

      if (res?.data) {
        setCreatedBookingData(res.data);
        toast.success(res.message || 'Đặt lịch online thành công!');
        onBooked?.();
      }
    } catch (error: unknown) {
      const {
        message,
        fieldErrors: serverFieldErrors,
        statusCode,
      } = extractApiError(error, 'Không thể đặt lịch hẹn. Vui lòng thử lại.');

      if (statusCode === 409) {
        setServerError(
          message || 'Thú cưng này đã có lịch trong ngày đã chọn.'
        );
        toast.error(message || 'Thú cưng này đã có lịch trong ngày đã chọn.');
      } else if (statusCode === 403) {
        setServerError('Tài khoản hiện tại không có quyền đặt lịch.');
        toast.error('Tài khoản hiện tại không có quyền đặt lịch.');
      } else if (statusCode === 404) {
        setServerError(message || 'Không tìm thấy thông tin yêu cầu.');
        toast.error(message || 'Không tìm thấy thông tin yêu cầu.');
      } else {
        setServerError(message);
        if (serverFieldErrors) {
          setFieldErrors(serverFieldErrors);
        }
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Đã sao chép mã số: ${code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetForm = () => {
    setCreatedBookingData(null);
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedSlotStart('');
    setBookingNote('');
    setFieldErrors({});
    setServerError(null);
    if (pets.length > 0) {
      setSelectedPetId(pets[0]._id);
    }
  };

  const Wrapper = embedded ? EmbeddedWrapper : SectionWrapper;
  const Card = embedded ? EmbeddedBookingCard : BookingCard;

  return (
    <Wrapper id={embedded ? undefined : 'quick-booking'}>
      <Card>
        {/* Left Information */}
        {!embedded && (
          <LeftInfo>
            <span className="booking-pill">
              <SafetyCertificateOutlined /> Đặt Lịch Hẹn Trực Tuyến
            </span>
            <h2>Đăng Ký Khám Cho Thú Cưng Nhanh Chóng</h2>
            <p className="desc">
              Chủ động chọn dịch vụ và ngày khám phù hợp cho thú cưng của bạn.
              Lịch hẹn cùng danh sách dịch vụ được hệ thống phòng khám VCMOS
              tiếp nhận đồng thời ngay sau khi đăng ký.
            </p>

            <ul className="benefits-list">
              <li>
                <div className="icon-box">
                  <CalendarOutlined />
                </div>
                <div className="text">
                  <strong>Đặt lịch và chọn dịch vụ linh hoạt</strong>
                  <span>
                    Lựa chọn nhiều dịch vụ chăm sóc, tiêm phòng hay khám tổng
                    quát ngay trong cùng một lượt hẹn.
                  </span>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <CheckCircleOutlined />
                </div>
                <div className="text">
                  <strong>Đồng bộ trực tiếp với hồ sơ thú cưng</strong>
                  <span>
                    Lịch hẹn tự động liên kết với hồ sơ thú cưng trên tài khoản
                    chủ nuôi để tiện theo dõi.
                  </span>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <SafetyCertificateOutlined />
                </div>
                <div className="text">
                  <strong>Tiếp nhận chu đáo tại phòng khám</strong>
                  <span>
                    Mã lượt hẹn tự động được cấp ngay khi đặt thành công, giảm
                    thiểu thời gian chờ làm thủ tục.
                  </span>
                </div>
              </li>
            </ul>

            <div className="hotline-box">
              <div className="phone-icon">
                <PhoneOutlined />
              </div>
              <div className="info">
                <div className="label">Hotline tiếp nhận & tư vấn 24/7</div>
                <div className="phone-num">0902.099.905</div>
              </div>
            </div>
          </LeftInfo>
        )}

        {/* Right Form Wrap: Single-screen unified form */}
        <FormWrap>
          {/* Guest or non-owner notices */}
          {!isLogin && (
            <GuestNotice>
              <span>Bạn đang thao tác với tư cách Khách.</span>
              <button
                type="button"
                className="btn-guest-login"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('open-vcmos-login'))
                }
              >
                <UserOutlined /> Đăng nhập để đặt lịch
              </button>
            </GuestNotice>
          )}

          {isLogin && !isOwner && (
            <Alert
              type="warning"
              showIcon
              message="Chỉ dành cho chủ nuôi"
              description="Chức năng đặt lịch online hiện chỉ hỗ trợ tài khoản Khách hàng (Chủ nuôi). Tài khoản nội bộ phòng khám vui lòng thao tác trên phần mềm quản lý."
              style={{ marginBottom: 20 }}
            />
          )}

          {/* Success View */}
          {createdBookingData ? (
            <SuccessCard>
              <div className="success-icon">
                <CheckCircleOutlined />
              </div>
              <h3>Đặt Lịch Hẹn Thành Công!</h3>
              <p className="subtext">
                Phòng khám VCMOS đã tiếp nhận lịch hẹn và các dịch vụ đăng ký
                của bạn. Vui lòng lưu lại mã lượt hẹn để làm thủ tục tiếp nhận.
              </p>

              <div className="appointment-code-box">
                <span className="code-label">Mã lượt hẹn trực tuyến</span>
                <span className="code-val">
                  {createdBookingData.appointment.code}
                </span>
                <Button
                  size="small"
                  type="text"
                  icon={copiedCode ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() =>
                    handleCopyCode(createdBookingData.appointment.code)
                  }
                >
                  {copiedCode ? 'Đã sao chép' : 'Sao chép mã'}
                </Button>
              </div>

              <div className="detail-summary">
                <div className="row">
                  <span style={{ color: '#64748b' }}>Thú cưng:</span>
                  <strong>{selectedPet?.name || 'Thú cưng'}</strong>
                </div>
                <div className="row">
                  <span style={{ color: '#64748b' }}>Ngày hẹn:</span>
                  <strong>
                    {dayjs(createdBookingData.appointment.date).format(
                      'DD/MM/YYYY'
                    )}
                  </strong>
                </div>
                {(createdBookingData.appointment.slotStart ||
                  createdBookingData.appointment.slotEnd) && (
                  <div className="row">
                    <span style={{ color: '#64748b' }}>Khung giờ hẹn:</span>
                    <strong style={{ color: '#0d9488' }}>
                      {createdBookingData.appointment.slotStart || '--:--'}
                      {createdBookingData.appointment.slotEnd
                        ? ` - ${createdBookingData.appointment.slotEnd}`
                        : ''}
                    </strong>
                  </div>
                )}
                <div className="row">
                  <span style={{ color: '#64748b' }}>Trạng thái:</span>
                  <strong style={{ color: '#0d9488' }}>Đã đặt (Booked)</strong>
                </div>
                {createdBookingData.appointment.note && (
                  <div className="row">
                    <span style={{ color: '#64748b' }}>Ghi chú:</span>
                    <span>{createdBookingData.appointment.note}</span>
                  </div>
                )}
                {createdBookingData.services &&
                  createdBookingData.services.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px dashed #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          marginBottom: 8,
                          fontSize: 13,
                        }}
                      >
                        Dịch vụ đã đăng ký ({createdBookingData.services.length}
                        ):
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {createdBookingData.services.map((s, idx) => {
                          const sInfo = activeServices.find(
                            as =>
                              as._id ===
                              (typeof s.serviceId === 'string'
                                ? s.serviceId
                                : s.serviceId._id)
                          );
                          return (
                            <div
                              key={s._id || idx}
                              style={{
                                display: 'flex',
                                justifySelf: 'stretch',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#f8fafc',
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #f1f5f9',
                              }}
                            >
                              <span>
                                <strong style={{ color: '#0d9488' }}>
                                  #{s.sequenceNo || idx + 1}.
                                </strong>{' '}
                                {sInfo?.name ||
                                  getAppointmentServiceName(s.serviceId)}
                                {(s.scheduledStart || s.scheduledEnd) && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: '#64748b',
                                      marginLeft: 6,
                                    }}
                                  >
                                    ({s.scheduledStart || ''}
                                    {s.scheduledEnd
                                      ? ` - ${s.scheduledEnd}`
                                      : ''}
                                    )
                                  </span>
                                )}
                                {s.isEmergency && (
                                  <Tag
                                    color="red"
                                    style={{ marginLeft: 6, fontSize: 11 }}
                                  >
                                    Khẩn cấp
                                  </Tag>
                                )}
                              </span>
                              <Tag
                                color={getAppointmentServiceStatusColor(
                                  s.status
                                )}
                              >
                                {getAppointmentServiceStatusLabel(s.status)}
                              </Tag>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>

              <div className="actions">
                <Button
                  type="primary"
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}
                  onClick={goToDashboard}
                >
                  {embedded ? 'Xem danh sách lịch hẹn' : 'Xem trong Dashboard'}
                </Button>
                <Button onClick={handleResetForm}>Đặt thêm lịch khác</Button>
              </div>
            </SuccessCard>
          ) : (
            <>
              {serverError && (
                <Alert
                  type="error"
                  showIcon
                  message={serverError}
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* 1. Pet Selection Block */}
              <div className="form-section-block">
                <div className="section-label">
                  1. Chọn thú cưng cần đặt lịch hẹn:
                </div>

                {!isLogin ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <UserOutlined
                      style={{
                        fontSize: 28,
                        color: '#0d9488',
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#0f172a',
                        marginBottom: 4,
                      }}
                    >
                      Vui lòng đăng nhập để xem danh sách thú cưng
                    </div>
                    <p
                      style={{
                        color: '#64748b',
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      Đăng nhập giúp hệ thống liên kết lịch hẹn với đúng hồ sơ
                      của bé.
                    </p>
                    <Button
                      type="primary"
                      style={{ background: '#0d9488' }}
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('open-vcmos-login')
                        )
                      }
                    >
                      Đăng nhập ngay
                    </Button>
                  </div>
                ) : petsLoading ? (
                  <div
                    style={{
                      padding: '24px 0',
                      textAlign: 'center',
                    }}
                  >
                    <Spin />
                    <div
                      style={{
                        marginTop: 8,
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      Đang tải danh sách thú cưng...
                    </div>
                  </div>
                ) : petsError ? (
                  <Alert
                    type="error"
                    showIcon
                    message={petsError}
                    action={
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          setPetsLoading(true);
                          PetService.listPets({
                            status: 'Active',
                            page: 1,
                            limit: 100,
                          })
                            .then(res => {
                              setPets(res?.items || []);
                              if (res?.items?.length) {
                                setSelectedPetId(res.items[0]._id);
                              }
                              setPetsError(null);
                            })
                            .catch(() => {
                              setPetsError('Không thể tải lại danh sách.');
                            })
                            .finally(() => setPetsLoading(false));
                        }}
                      >
                        Thử lại
                      </Button>
                    }
                  />
                ) : pets.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <InfoCircleOutlined
                      style={{
                        fontSize: 28,
                        color: '#f59e0b',
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: 4,
                      }}
                    >
                      Bạn chưa có hồ sơ thú cưng nào
                    </div>
                    <p
                      style={{
                        color: '#64748b',
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      Vui lòng tạo ít nhất một hồ sơ thú cưng trước khi đặt lịch
                      khám trực tuyến.
                    </p>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ background: '#0d9488' }}
                      onClick={goToAddPet}
                    >
                      {embedded
                        ? 'Thêm thú cưng'
                        : 'Thêm thú cưng trong Dashboard'}
                    </Button>
                    {fieldErrors.petId && (
                      <div className="field-error" style={{ marginTop: 8 }}>
                        {fieldErrors.petId}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedPetId || undefined}
                      onChange={val => {
                        setSelectedPetId(val);
                        setFieldErrors(prev => ({ ...prev, petId: '' }));
                      }}
                      placeholder="Chọn thú cưng cần đặt lịch"
                      style={{ width: '100%', marginBottom: 4 }}
                      size="large"
                      status={fieldErrors.petId ? 'error' : undefined}
                      options={pets.map(p => ({
                        value: p._id,
                        label: `Bé ${p.name} · ${p.species || 'Thú cưng'} (${p.breed || 'Chưa rõ giống'}${p.weight ? ` · ${p.weight} kg` : ''})`,
                      }))}
                    />
                    {fieldErrors.petId && (
                      <div className="field-error">{fieldErrors.petId}</div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 4,
                      }}
                    >
                      <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined />}
                        style={{ color: '#0d9488', padding: 0 }}
                        onClick={goToAddPet}
                      >
                        + Thêm hồ sơ thú cưng khác
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* 2. Active Services Selection Block */}
              <div className="form-section-block">
                <BookingServiceStep
                  title="2. Chọn các dịch vụ khám & chăm sóc (chọn ít nhất 1 dịch vụ):"
                  services={activeServices}
                  loading={servicesLoading}
                  error={servicesError}
                  onRetry={loadActiveServices}
                  selectedServices={selectedServices}
                  onChange={updated => {
                    setSelectedServices(updated);
                    setFieldErrors(prev => ({
                      ...prev,
                      services: '',
                      slotStart: '',
                    }));
                    setServerError(null);
                  }}
                  errorText={fieldErrors.services}
                />
              </div>

              {/* 3. Date & Note Block */}
              <div className="form-section-block">
                <div className="grid-two-cols">
                  <div>
                    <div className="section-label">
                      3. Ngày hẹn & Khung giờ khám:
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div>
                        <DatePicker
                          value={selectedDate}
                          onChange={val => {
                            setSelectedDate(val);
                            setBookingClock(new Date());
                            setFieldErrors(prev => ({
                              ...prev,
                              date: '',
                              slotStart: '',
                            }));
                            setServerError(null);
                          }}
                          disabledDate={disabledDate}
                          format="DD/MM/YYYY"
                          placeholder="Chọn ngày hẹn khám (từ hôm nay)"
                          style={{ width: '100%', marginBottom: 4 }}
                          size="large"
                          status={fieldErrors.date ? 'error' : undefined}
                        />
                        {fieldErrors.date && (
                          <div className="field-error">{fieldErrors.date}</div>
                        )}
                      </div>

                      <div>
                        <Select
                          value={selectedSlotStart || undefined}
                          onChange={val => {
                            setSelectedSlotStart(val || '');
                            setFieldErrors(prev => ({
                              ...prev,
                              slotStart: '',
                            }));
                            setServerError(null);
                          }}
                          aria-label="Giờ hẹn"
                          aria-required="true"
                          aria-invalid={Boolean(slotError)}
                          aria-describedby={
                            slotError ? 'booking-slot-error' : undefined
                          }
                          placeholder={
                            dateStr
                              ? 'Chọn giờ hẹn (bắt buộc)'
                              : 'Chọn ngày trước khi chọn giờ hẹn'
                          }
                          disabled={!dateStr}
                          onOpenChange={open => {
                            if (open) setBookingClock(new Date());
                          }}
                          virtual={false}
                          allowClear
                          style={{ width: '100%', marginBottom: 4 }}
                          size="large"
                          options={clinicSlotOptions}
                          status={slotError ? 'error' : undefined}
                        />
                        {slotError ? (
                          <div
                            className="field-error"
                            id="booking-slot-error"
                            role="alert"
                          >
                            {slotError}
                          </div>
                        ) : dateStr &&
                          clinicSlotOptions.every(slot => slot.disabled) ? (
                          <div className="field-error" role="status">
                            Không còn khung giờ phù hợp. Hãy chọn ngày khác hoặc
                            điều chỉnh dịch vụ.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="section-label">
                      4. Ghi chú triệu chứng hoặc lưu ý (tùy chọn):
                    </div>
                    <Input.TextArea
                      rows={4}
                      value={bookingNote}
                      onChange={e => {
                        setBookingNote(e.target.value);
                        setFieldErrors(prev => ({ ...prev, note: '' }));
                        setServerError(null);
                      }}
                      placeholder="Ví dụ: Bé có biểu hiện ngứa tai, biếng ăn..."
                      maxLength={500}
                      showCount
                      status={fieldErrors.note ? 'error' : undefined}
                      style={{ marginBottom: 4 }}
                    />
                    {fieldErrors.note && (
                      <div className="field-error">{fieldErrors.note}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Quick Summary Strip & Submit Row */}
              <div className="booking-summary-strip">
                <div className="summary-items">
                  <div>
                    Thú cưng:{' '}
                    <strong>
                      {selectedPet ? `Bé ${selectedPet.name}` : 'Chưa chọn'}
                    </strong>
                  </div>
                  <div>
                    Dịch vụ:{' '}
                    <strong>
                      {selectedServices.length > 0
                        ? `${selectedServices.length} dịch vụ`
                        : 'Chưa chọn'}
                    </strong>
                  </div>
                  <div>
                    Ngày hẹn:{' '}
                    <strong>
                      {selectedDate
                        ? selectedDate.format('DD/MM/YYYY')
                        : 'Chưa chọn'}
                    </strong>
                  </div>
                  <div>
                    Giờ hẹn dự kiến:{' '}
                    <strong>
                      {estimatedEnd
                        ? `${selectedSlotStart} – ${estimatedEnd} (${totalDuration} phút)`
                        : 'Chưa có khung giờ'}
                    </strong>
                  </div>
                </div>
                {selectedServices.length > 0 && (
                  <div className="summary-total">
                    Tạm tính: {formatServicePrice(totalSelectedPrice)}
                  </div>
                )}
              </div>

              <div className="form-submit-row">
                <div className="note-text">
                  Lịch hẹn và các dịch vụ đăng ký sẽ được khởi tạo cùng lúc sau
                  khi xác nhận.
                </div>
                <Button
                  type="primary"
                  className="btn-submit"
                  loading={submitting}
                  onClick={handleSubmitBooking}
                  icon={<CheckCircleOutlined />}
                  disabled={petsLoading || servicesLoading}
                >
                  Xác nhận đặt lịch hẹn
                </Button>
              </div>
            </>
          )}
        </FormWrap>
      </Card>
    </Wrapper>
  );
};

export default QuickBookingSection;
