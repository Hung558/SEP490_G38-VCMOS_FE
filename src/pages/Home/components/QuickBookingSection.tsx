import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Steps, DatePicker, Alert, Spin } from 'antd';
import {
  CheckCircleOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  RightOutlined,
  LeftOutlined,
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
import { normalizeRole } from '@/constants/roles';
import PetService from '@/services/PetService';
import AppointmentOrderService, {
  extractApiError,
  validateBookingDate,
  validateBookingNote,
  validateBookingPetId,
  getVietnamTodayString,
} from '@/services/AppointmentOrderService';
import type { Pet, OnlineAppointment } from '@/types';
import ROUTER from '@/routerMap/ROUTER';

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
  padding: 32px;

  @media (max-width: 640px) {
    padding: 20px 16px;
  }

  .wizard-steps {
    margin-bottom: 28px;
    .ant-steps-item-title {
      font-size: 13px !important;
      font-weight: 600;
    }
  }

  .step-content {
    min-height: 260px;
  }

  .section-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: 4px;
    margin-bottom: 12px;
  }

  .summary-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 24px;

    .sum-row {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      padding: 8px 0;
      border-bottom: 1px dashed #f1f5f9;
      color: #334155;

      span.label {
        color: #64748b;
      }

      strong {
        color: #0f172a;
      }

      &.highlight {
        border-bottom: none;
        border-top: 1.5px solid #e2e8f0;
        margin-top: 8px;
        padding-top: 12px;
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;

        .status-badge {
          color: #0d9488;
        }
      }
    }
  }

  .wizard-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid #e2e8f0;

    .btn-step {
      height: 42px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    .btn-next,
    .btn-submit {
      background: #0d9488;
      border-color: #0d9488;
      color: #ffffff;

      &:hover {
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
      padding: 4px 0;
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

const QuickBookingSection: React.FC = () => {
  const navigate = useNavigate();
  const { isLogin } = useIsLogin();
  const { user } = useAuth();

  const userRole = normalizeRole(user?.role);
  const isOwner = userRole === 'PetOwner';

  // Wizard step: 0 = Thú cưng, 1 = Ngày & Ghi chú, 2 = Xác nhận
  const [currentStep, setCurrentStep] = useState(0);

  // Form states
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [bookingNote, setBookingNote] = useState('');

  // Validation / Error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [createdAppointment, setCreatedAppointment] =
    useState<OnlineAppointment | null>(null);
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
            setSelectedPetId(prev => prev || items[0]._id);
          }
        }
      } catch (err: unknown) {
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
  }, [isLogin, isOwner]);

  // Disable past dates according to Vietnam date semantics
  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    const todayStr = getVietnamTodayString();
    return current.isBefore(dayjs(todayStr), 'day');
  };

  const selectedPet = pets.find(p => p._id === selectedPetId);

  // Wizard navigation
  const handleNext = () => {
    setServerError(null);

    // Guest gate
    if (!isLogin) {
      toast.info('Vui lòng đăng nhập tài khoản chủ nuôi để đặt lịch hẹn!');
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }

    if (!isOwner) {
      toast.error(
        'Chức năng đặt lịch online chỉ dành cho tài khoản Khách hàng (Chủ nuôi).'
      );
      return;
    }

    if (currentStep === 0) {
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
      const petErr = validateBookingPetId(selectedPetId);
      if (petErr) {
        setFieldErrors(prev => ({ ...prev, petId: petErr }));
        return;
      }
      setFieldErrors(prev => ({ ...prev, petId: '' }));
      setCurrentStep(1);
    } else if (currentStep === 1) {
      const dateStr = selectedDate
        ? selectedDate.format('YYYY-MM-DD')
        : undefined;
      const dateErr = validateBookingDate(dateStr);
      const noteErr = validateBookingNote(bookingNote);

      if (dateErr || noteErr) {
        setFieldErrors(prev => ({
          ...prev,
          ...(dateErr ? { date: dateErr } : { date: '' }),
          ...(noteErr ? { note: noteErr } : { note: '' }),
        }));
        return;
      }
      setFieldErrors({});
      setCurrentStep(2);
    }
  };

  const handlePrev = () => {
    setServerError(null);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  // Submit online booking
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

    const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
    const petErr = validateBookingPetId(selectedPetId);
    const dateErr = validateBookingDate(dateStr);
    const noteErr = validateBookingNote(bookingNote);

    if (petErr || dateErr || noteErr) {
      setFieldErrors({
        ...(petErr ? { petId: petErr } : {}),
        ...(dateErr ? { date: dateErr } : {}),
        ...(noteErr ? { note: noteErr } : {}),
      });
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await AppointmentOrderService.createOnlineBooking({
        petId: selectedPetId,
        date: dateStr,
        note: bookingNote,
      });

      if (res?.data) {
        setCreatedAppointment(res.data);
        toast.success(res.message || 'Đặt lịch khám thành công!');
      }
    } catch (error: unknown) {
      const {
        message,
        fieldErrors: serverFieldErrors,
        status,
      } = extractApiError(error, 'Không thể đặt lịch hẹn. Vui lòng thử lại.');

      if (status === 409) {
        setServerError('Thú cưng này đã có lịch trong ngày đã chọn.');
        toast.error('Thú cưng này đã có lịch trong ngày đã chọn.');
      } else if (status === 403) {
        setServerError('Tài khoản hiện tại không có quyền đặt lịch.');
        toast.error('Tài khoản hiện tại không có quyền đặt lịch.');
      } else if (status === 404) {
        setServerError(message || 'Không tìm thấy thú cưng.');
        toast.error(message || 'Không tìm thấy thú cưng.');
      } else {
        setServerError(message);
        setFieldErrors(serverFieldErrors);
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
    setCreatedAppointment(null);
    setCurrentStep(0);
    setSelectedDate(null);
    setBookingNote('');
    setFieldErrors({});
    setServerError(null);
    if (pets.length > 0) {
      setSelectedPetId(pets[0]._id);
    }
  };

  return (
    <SectionWrapper id="quick-booking">
      <BookingCard>
        {/* Left Information */}
        <LeftInfo>
          <span className="booking-pill">
            <SafetyCertificateOutlined /> Đặt Lịch Hẹn Trực Tuyến
          </span>
          <h2>Đăng Ký Khám Cho Thú Cưng Nhanh Chóng</h2>
          <p className="desc">
            Chủ động chọn ngày khám phù hợp và để lại thông tin triệu chứng cho
            bác sĩ trước khi đến phòng khám. Lịch hẹn được hệ thống tiếp nhận
            ngay sau khi đăng ký.
          </p>

          <ul className="benefits-list">
            <li>
              <div className="icon-box">
                <CalendarOutlined />
              </div>
              <div className="text">
                <strong>Đặt lịch theo ngày thuận tiện</strong>
                <span>
                  Chọn ngày khám linh hoạt từ hôm nay trở đi theo múi giờ Việt
                  Nam, dễ dàng sắp xếp lịch trình.
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

        {/* Right Form Wrap */}
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
          {createdAppointment ? (
            <SuccessCard>
              <div className="success-icon">
                <CheckCircleOutlined />
              </div>
              <h3>Đặt Lịch Hẹn Thành Công!</h3>
              <p className="subtext">
                Phòng khám VCMOS đã tiếp nhận lịch hẹn của bạn. Vui lòng lưu lại
                mã lượt hẹn để làm thủ tục tiếp nhận.
              </p>

              <div className="appointment-code-box">
                <span className="code-label">Mã lượt hẹn trực tuyến</span>
                <span className="code-val">{createdAppointment.code}</span>
                <Button
                  size="small"
                  type="text"
                  icon={copiedCode ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() => handleCopyCode(createdAppointment.code)}
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
                    {dayjs(createdAppointment.date).format('DD/MM/YYYY')}
                  </strong>
                </div>
                <div className="row">
                  <span style={{ color: '#64748b' }}>Trạng thái:</span>
                  <strong style={{ color: '#0d9488' }}>Đã đặt (Booked)</strong>
                </div>
                {createdAppointment.note && (
                  <div className="row">
                    <span style={{ color: '#64748b' }}>Ghi chú:</span>
                    <span>{createdAppointment.note}</span>
                  </div>
                )}
              </div>

              <div className="actions">
                <Button
                  type="primary"
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}
                  onClick={() => navigate(ROUTER.DASHBOARD)}
                >
                  Xem trong Dashboard
                </Button>
                <Button onClick={handleResetForm}>Đặt thêm lịch khác</Button>
              </div>
            </SuccessCard>
          ) : (
            <>
              <Steps
                className="wizard-steps"
                size="small"
                current={currentStep}
                items={[
                  { title: '1. Thú cưng' },
                  { title: '2. Ngày & Ghi chú' },
                  { title: '3. Xác nhận' },
                ]}
              />

              {serverError && (
                <Alert
                  type="error"
                  showIcon
                  message={serverError}
                  style={{ marginBottom: 16 }}
                />
              )}

              <div className="step-content">
                {/* Step 0: Pet Selection */}
                {currentStep === 0 && (
                  <div>
                    <div className="section-label">
                      1. Chọn thú cưng của bạn:
                    </div>

                    {!isLogin ? (
                      <div
                        style={{
                          padding: '32px 16px',
                          textAlign: 'center',
                          background: '#ffffff',
                          borderRadius: 8,
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        <UserOutlined
                          style={{
                            fontSize: 32,
                            color: '#0d9488',
                            marginBottom: 10,
                          }}
                        />
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#0f172a',
                            marginBottom: 6,
                          }}
                        >
                          Vui lòng đăng nhập để xem danh sách thú cưng
                        </div>
                        <p
                          style={{
                            color: '#64748b',
                            fontSize: 13,
                            marginBottom: 16,
                          }}
                        >
                          Đăng nhập giúp hệ thống liên kết lịch hẹn với đúng hồ
                          sơ của bé.
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
                          padding: '40px 0',
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
                          padding: '32px 16px',
                          textAlign: 'center',
                          background: '#ffffff',
                          borderRadius: 8,
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        <InfoCircleOutlined
                          style={{
                            fontSize: 32,
                            color: '#f59e0b',
                            marginBottom: 10,
                          }}
                        />
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            marginBottom: 6,
                          }}
                        >
                          Bạn chưa có hồ sơ thú cưng nào
                        </div>
                        <p
                          style={{
                            color: '#64748b',
                            fontSize: 13,
                            marginBottom: 16,
                          }}
                        >
                          Vui lòng tạo ít nhất một hồ sơ thú cưng trước khi đặt
                          lịch khám trực tuyến.
                        </p>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          style={{ background: '#0d9488' }}
                          onClick={() => navigate(ROUTER.DASHBOARD)}
                        >
                          Thêm thú cưng trong Dashboard
                        </Button>
                        {fieldErrors.petId && (
                          <div
                            className="field-error"
                            style={{ marginTop: 12 }}
                          >
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
                          style={{ width: '100%', marginBottom: 8 }}
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
                            marginTop: 8,
                          }}
                        >
                          <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            style={{ color: '#0d9488', padding: 0 }}
                            onClick={() => navigate(ROUTER.DASHBOARD)}
                          >
                            + Thêm hồ sơ thú cưng khác
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 1: Date & Note */}
                {currentStep === 1 && (
                  <div>
                    <div className="section-label">
                      1. Chọn ngày hẹn khám (từ hôm nay trở đi):
                    </div>
                    <DatePicker
                      value={selectedDate}
                      onChange={val => {
                        setSelectedDate(val);
                        setFieldErrors(prev => ({ ...prev, date: '' }));
                        setServerError(null);
                      }}
                      disabledDate={disabledDate}
                      format="DD/MM/YYYY"
                      placeholder="Chọn ngày hẹn khám"
                      style={{ width: '100%', marginBottom: 8 }}
                      size="large"
                      status={fieldErrors.date ? 'error' : undefined}
                    />
                    {fieldErrors.date && (
                      <div className="field-error">{fieldErrors.date}</div>
                    )}

                    <div className="section-label" style={{ marginTop: 16 }}>
                      2. Ghi chú triệu chứng hoặc lưu ý chăm sóc (tối đa 500 ký
                      tự):
                    </div>
                    <Input.TextArea
                      rows={5}
                      value={bookingNote}
                      onChange={e => {
                        setBookingNote(e.target.value);
                        setFieldErrors(prev => ({ ...prev, note: '' }));
                      }}
                      placeholder="Ví dụ: Bé có biểu hiện biếng ăn, sốt nhẹ 2 ngày nay. Cần kiểm tra tổng quát..."
                      maxLength={500}
                      showCount
                      status={fieldErrors.note ? 'error' : undefined}
                      style={{ marginBottom: 8 }}
                    />
                    {fieldErrors.note && (
                      <div className="field-error">{fieldErrors.note}</div>
                    )}
                  </div>
                )}

                {/* Step 2: Summary & Confirmation */}
                {currentStep === 2 && (
                  <div>
                    <div className="section-label">
                      Xác nhận thông tin đặt hẹn:
                    </div>
                    <div className="summary-box">
                      <div className="sum-row">
                        <span className="label">Thú cưng:</span>
                        <strong>
                          Bé {selectedPet?.name} (
                          {selectedPet?.species || 'Thú cưng'} -{' '}
                          {selectedPet?.breed || 'Giống chung'})
                        </strong>
                      </div>
                      <div className="sum-row">
                        <span className="label">Ngày hẹn khám:</span>
                        <strong>
                          {selectedDate
                            ? selectedDate.format('DD/MM/YYYY')
                            : 'Chưa chọn'}
                        </strong>
                      </div>
                      <div className="sum-row">
                        <span className="label">Ghi chú cho phòng khám:</span>
                        <span>{bookingNote.trim() || 'Không có ghi chú'}</span>
                      </div>
                      <div className="sum-row highlight">
                        <span className="label">Trạng thái khởi tạo:</span>
                        <span className="status-badge">Đã đặt (Booked)</span>
                      </div>
                    </div>

                    <Alert
                      type="info"
                      showIcon
                      message="Lưu ý tiếp nhận"
                      description="Sau khi xác nhận, lịch hẹn sẽ được tạo trên hệ thống VCMOS. Nhân viên lễ tân sẽ kiểm tra và tiếp nhận bé theo đúng ngày bạn đã chọn."
                    />
                  </div>
                )}
              </div>

              {/* Wizard Footer Controls */}
              <div className="wizard-footer">
                {currentStep > 0 ? (
                  <Button
                    className="btn-step"
                    icon={<LeftOutlined />}
                    onClick={handlePrev}
                    disabled={submitting}
                  >
                    Quay lại
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 2 ? (
                  <Button
                    type="primary"
                    className="btn-step btn-next"
                    onClick={handleNext}
                    disabled={petsLoading}
                  >
                    Tiếp tục <RightOutlined />
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="btn-step btn-submit"
                    loading={submitting}
                    onClick={handleSubmitBooking}
                    icon={<CheckCircleOutlined />}
                  >
                    Xác nhận đặt lịch hẹn
                  </Button>
                )}
              </div>
            </>
          )}
        </FormWrap>
      </BookingCard>
    </SectionWrapper>
  );
};

export default QuickBookingSection;
