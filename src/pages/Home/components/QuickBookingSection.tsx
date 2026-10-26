import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Steps } from 'antd';
import {
  CheckCircleOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  MedicineBoxOutlined,
  FileSearchOutlined,
  RightOutlined,
  LeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

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
  padding: 10px 14px;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #0f766e;

  .btn-guest-login {
    background: #0d9488;
    color: #ffffff;
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
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
    min-height: 280px;
  }

  .section-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .service-card-select {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;

    .srv-item {
      padding: 12px 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s;

      &:hover {
        border-color: #cbd5e1;
      }

      &.selected {
        border-color: #0d9488;
        background: #f0fdfa;
      }

      .left {
        display: flex;
        align-items: center;
        gap: 12px;

        .icon {
          color: #0d9488;
          font-size: 18px;
        }

        .name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .duration {
          font-size: 12px;
          color: #64748b;
        }
      }

      .price {
        font-size: 14px;
        font-weight: 700;
        color: #0d9488;
      }
    }
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
      padding: 6px 0;
      border-bottom: 1px dashed #f1f5f9;
      color: #334155;

      &.total {
        border-bottom: none;
        border-top: 1.5px solid #e2e8f0;
        margin-top: 8px;
        padding-top: 12px;
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;

        .price-final {
          color: #0d9488;
        }
      }
    }
  }

  .slots-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 20px;

    @media (max-width: 600px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .slot-btn {
      padding: 8px 4px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;

      &.active {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }

      &:hover:not(.active) {
        border-color: #0d9488;
        color: #0d9488;
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

const timeSlots = [
  '08:30 Sáng',
  '09:30 Sáng',
  '10:30 Sáng',
  '11:15 Trưa',
  '14:00 Chiều',
  '15:30 Chiều',
  '17:00 Chiều',
  '18:30 Tối',
];

const availableServices = [
  {
    id: 'exam',
    title: 'Khám lâm sàng tổng quát & Bệnh án SOAP',
    duration: 30,
    price: 150000,
    icon: <MedicineBoxOutlined />,
  },
  {
    id: 'vaccine',
    title: 'Tiêm chủng Vaccine đa giá & Sổ giun',
    duration: 20,
    price: 180000,
    icon: <CheckCircleOutlined />,
  },
  {
    id: 'grooming',
    title: 'Grooming Spa & Cắt tỉa lông thẩm mỹ',
    duration: 60,
    price: 250000,
    icon: <ScissorOutlined />,
  },
  {
    id: 'imaging',
    title: 'Chẩn đoán hình ảnh: Siêu âm Doppler & X-Quang',
    duration: 30,
    price: 300000,
    icon: <FileSearchOutlined />,
  },
];

const staffList = [
  {
    value: 'any',
    label: 'Bất kỳ bác sĩ / kỹ thuật viên trực ca (Khuyên dùng)',
  },
  {
    value: 'vet_b',
    label: 'BS. CKI Trần Mai Anh (Trưởng khoa Nội & Siêu âm Doppler)',
  },
  {
    value: 'vet_nam',
    label:
      'ThS. BS. Nguyễn Hoàng Nam (Chuyên khoa Ngoại & Chấn thương chỉnh hình)',
  },
  {
    value: 'groomer_d',
    label:
      'Chuyên viên Lê Thu Trang (Trưởng nhóm Grooming Spa & Trị liệu da lông)',
  },
];

const QuickBookingSection: React.FC = () => {
  const { isLogin } = useIsLogin();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPet, setSelectedPet] = useState('milo');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    'exam',
  ]);
  const [selectedStaff, setSelectedStaff] = useState('any');
  const [selectedSlot, setSelectedSlot] = useState('09:30 Sáng');
  const [bookingNote, setBookingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter(item => item !== id)
          : prev
        : [...prev, id]
    );
  };

  const selectedServices = availableServices.filter(s =>
    selectedServiceIds.includes(s.id)
  );
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration,
    0
  );
  const totalFee = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleNext = () => {
    if (!isLogin && currentStep === 0) {
      toast.info(
        'Vui lòng đăng nhập để đồng bộ lịch hẹn với hồ sơ thú cưng của bạn!'
      );
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmitBooking = () => {
    if (!isLogin) {
      toast.info(
        'Vui lòng đăng nhập tài khoản chủ nuôi để hoàn tất đặt lịch hẹn!'
      );
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(
        'Đặt lịch hẹn thành công! Phòng khám VCMOS đã ghi nhận lượt hẹn của bạn.'
      );
      setCurrentStep(0);
    }, 700);
  };

  return (
    <SectionWrapper id="quick-booking">
      <BookingCard>
        {/* Left Information */}
        <LeftInfo>
          <span className="booking-pill">
            <SafetyCertificateOutlined /> Quy Trình Đặt Hẹn 4 Bước
          </span>
          <h2>Đặt Lịch Dịch Vụ & Khám Bệnh Trực Tuyến</h2>
          <p className="desc">
            Chủ động chọn thời gian, bác sĩ phụ trách và dịch vụ liên tiếp cho
            bé cưng. Lịch hẹn được hệ thống xếp hàng tự động, không lo chờ đợi.
          </p>

          <ul className="benefits-list">
            <li>
              <div className="icon-box">
                <CheckCircleOutlined />
              </div>
              <div className="text">
                <strong>Xếp slot liên tiếp tự động</strong>
                <span>
                  Hệ thống tự động tính toán thời gian nối tiếp giữa các dịch vụ
                  khám và spa.
                </span>
              </div>
            </li>
            <li>
              <div className="icon-box">
                <ClockCircleOutlined />
              </div>
              <div className="text">
                <strong>Chủ động chọn bác sĩ trực ca</strong>
                <span>
                  Lịch hẹn lập tức chuyển sang trạng thái đã đặt mà không cần
                  chờ duyệt thủ công.
                </span>
              </div>
            </li>
            <li>
              <div className="icon-box">
                <SafetyCertificateOutlined />
              </div>
              <div className="text">
                <strong>Lưu trữ bệnh án điện tử SOAP</strong>
                <span>
                  Mọi kết quả và lịch sử khám chữa bệnh lưu trữ trọn đời trên hồ
                  sơ của bé.
                </span>
              </div>
            </li>
          </ul>

          <div className="hotline-box">
            <div className="phone-icon">
              <PhoneOutlined />
            </div>
            <div className="info">
              <div className="label">Hotline tiếp nhận & cấp cứu 24/7</div>
              <div className="phone-num">0902.099.905</div>
            </div>
          </div>
        </LeftInfo>

        {/* Right Form Wrap - 4-step wizard */}
        <FormWrap>
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

          <Steps
            className="wizard-steps"
            size="small"
            current={currentStep}
            items={[
              { title: '1. Thú cưng' },
              { title: '2. Ngày & Bác sĩ' },
              { title: '3. Ghi chú' },
              { title: '4. Xác nhận' },
            ]}
          />

          <div className="step-content">
            {/* Step 1: Pet & Services */}
            {currentStep === 0 && (
              <div>
                <div className="section-label">1. Chọn thú cưng của bạn:</div>
                <Select
                  value={selectedPet}
                  onChange={setSelectedPet}
                  style={{ width: '100%', marginBottom: 20 }}
                  size="large"
                  options={[
                    {
                      value: 'milo',
                      label: 'Bé Milo · Chó Poodle (5.2 kg · 3 tuổi)',
                    },
                    {
                      value: 'miu',
                      label: 'Bé Miu · Mèo Anh lông ngắn (4.0 kg · 2 tuổi)',
                    },
                    {
                      value: 'walkin',
                      label: '+ Khách mới / Thêm hồ sơ thú cưng khác',
                    },
                  ]}
                />

                <div className="section-label">
                  2. Chọn dịch vụ (chọn 1 hoặc nhiều):
                </div>
                <div className="service-card-select">
                  {availableServices.map(srv => {
                    const isSelected = selectedServiceIds.includes(srv.id);
                    return (
                      <div
                        key={srv.id}
                        className={`srv-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleService(srv.id)}
                      >
                        <div className="left">
                          <div className="icon">{srv.icon}</div>
                          <div>
                            <div className="name">{srv.title}</div>
                            <div className="duration">
                              <ClockCircleOutlined /> Ước tính: {srv.duration}{' '}
                              phút
                            </div>
                          </div>
                        </div>
                        <div className="price">
                          {srv.price.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Date & Staff */}
            {currentStep === 1 && (
              <div>
                <div className="section-label">
                  1. Bác sĩ hoặc Chuyên viên mong muốn:
                </div>
                <Select
                  value={selectedStaff}
                  onChange={setSelectedStaff}
                  style={{ width: '100%', marginBottom: 20 }}
                  size="large"
                  options={staffList}
                />

                <div className="section-label">
                  2. Chọn khung giờ tiếp nhận hôm nay:
                </div>
                <div className="slots-row">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      className={`slot-btn ${selectedSlot === slot ? 'active' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Booking Note */}
            {currentStep === 2 && (
              <div>
                <div className="section-label">
                  Ghi chú triệu chứng hoặc lưu ý chăm sóc (tối đa 500 ký tự):
                </div>
                <Input.TextArea
                  rows={5}
                  value={bookingNote}
                  onChange={e => setBookingNote(e.target.value)}
                  placeholder="Ví dụ: Bé có tiền sử dị ứng hải sản, sáng nay nôn nhẹ và mệt mỏi. Cần bác sĩ kiểm tra tiêu hoá..."
                  maxLength={500}
                  showCount
                  style={{ marginBottom: 20 }}
                />
              </div>
            )}

            {/* Step 4: Summary & Confirm */}
            {currentStep === 3 && (
              <div>
                <div className="section-label">Tóm tắt thông tin đặt hẹn:</div>
                <div className="summary-box">
                  <div className="sum-row">
                    <span>Thú cưng:</span>
                    <strong>
                      {selectedPet === 'milo'
                        ? 'Bé Milo (Chó Poodle · 5.2 kg)'
                        : 'Bé Miu (Mèo Anh)'}
                    </strong>
                  </div>
                  <div className="sum-row">
                    <span>Thời gian hẹn:</span>
                    <strong>Hôm nay, {selectedSlot}</strong>
                  </div>
                  <div className="sum-row">
                    <span>Bác sĩ phụ trách:</span>
                    <strong>
                      {staffList.find(s => s.value === selectedStaff)?.label}
                    </strong>
                  </div>
                  <div className="sum-row">
                    <span>Tổng thời lượng:</span>
                    <strong>{totalDuration} phút liên tiếp</strong>
                  </div>
                  {bookingNote && (
                    <div className="sum-row">
                      <span>Ghi chú:</span>
                      <span>{bookingNote}</span>
                    </div>
                  )}
                  <div className="sum-row total">
                    <span>Tổng chi phí ước tính:</span>
                    <span className="price-final">
                      {totalFee.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div className="wizard-footer">
            {currentStep > 0 ? (
              <Button
                className="btn-step"
                icon={<LeftOutlined />}
                onClick={handlePrev}
              >
                Quay lại
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <Button
                type="primary"
                className="btn-step btn-next"
                onClick={handleNext}
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
        </FormWrap>
      </BookingCard>
    </SectionWrapper>
  );
};

export default QuickBookingSection;
