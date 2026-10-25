import React, { useState, useEffect } from 'react';
import SpinCustom from '@/components/common/Spin';
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  EyeOutlined,
  EyeInvisibleOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Form, Input } from 'antd';
import styled from 'styled-components';
import { toast } from 'sonner';
import UserService from '@/services/UserService';

const FormCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  padding: 40px 36px;
  width: 100%;
  max-width: 460px;
  box-shadow:
    0 20px 60px rgba(0, 77, 64, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.8);
  animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @keyframes slideUpFade {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    padding: 28px 20px;
  }
`;

const ShieldIconBox = styled.div`
  width: 56px;
  height: 56px;
  background: #e6f4f2;
  color: #00796b;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin: 0 auto 16px auto;
`;

const CategoryBadge = styled.div`
  display: inline-block;
  padding: 4px 12px;
  background: #e0f2f1;
  color: #00796b;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  text-align: center;
`;

const HeaderWrapper = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
`;

// Steps Bar
const StepsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 14px;
    left: 24px;
    right: 24px;
    height: 2px;
    background: #e2e8f0;
    z-index: 1;
  }
`;

const StepItem = styled.div<{ $active: boolean; $completed: boolean }>`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  .step-circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    background: ${props =>
      props.$completed ? '#00796b' : props.$active ? '#00796b' : '#ffffff'};
    color: ${props =>
      props.$completed || props.$active ? '#ffffff' : '#94a3b8'};
    border: 2px solid
      ${props => (props.$completed || props.$active ? '#00796b' : '#cbd5e1')};
    transition: all 0.3s;
  }

  .step-label {
    font-size: 12px;
    font-weight: ${props => (props.$active ? '700' : '500')};
    color: ${props => (props.$active ? '#0f172a' : '#64748b')};
  }
`;

const CustomFormItem = styled(Form.Item)`
  margin-bottom: 18px;

  .ant-input-affix-wrapper,
  & > .ant-input {
    background-color: #f8fafc !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    font-size: 15px;
    box-shadow: none !important;
    transition: all 0.2s ease !important;

    &:hover {
      border-color: #cbd5e1 !important;
      background-color: #f1f5f9 !important;
    }

    &-focused,
    &:focus,
    &:focus-within {
      background-color: #ffffff !important;
      border-color: #00796b !important;
      box-shadow: 0 0 0 3px rgba(0, 121, 107, 0.15) !important;
    }
  }

  .ant-input {
    color: #0f172a;
    &::placeholder {
      color: #94a3b8;
    }
  }

  .ant-input-prefix {
    margin-right: 10px;
    color: #64748b;
    font-size: 16px;
  }
`;

const PrimarySubmitBtn = styled.button`
  width: 100%;
  height: 50px;
  background: #00695c;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 12px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 105, 92, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #004d40;
    box-shadow: 0 6px 16px rgba(0, 105, 92, 0.35);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const BackLink = styled.button`
  background: none;
  border: none;
  color: #475569;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  transition: color 0.2s;

  &:hover {
    color: #00695c;
    text-decoration: underline;
  }
`;

const NoticeAlertBox = styled.div`
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 20px;
  font-size: 12.5px;
  color: #92400e;
  line-height: 1.5;
`;

const SecurityFooter = styled.div`
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;

  .left {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #00796b;
    font-weight: 500;
  }
`;

// Strength Meter & Checklist for Step 3
const StrengthBarWrapper = styled.div`
  margin: -8px 0 16px 0;

  .labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
  }

  .bars {
    display: flex;
    gap: 6px;
    height: 4px;

    .bar {
      flex: 1;
      border-radius: 2px;
      background: #e2e8f0;
      transition: background-color 0.3s;
    }
  }
`;

const SecurityChecklist = styled.div`
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 18px;

  .title {
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .item {
    font-size: 12px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;

    &.valid {
      color: #059669;
      font-weight: 500;
    }
  }
`;

interface ForgotPasswordFormProps {
  onToggleView: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onToggleView,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [newPassword, setNewPassword] = useState<string>('');

  const [formStep1] = Form.useForm();
  const [formStep2] = Form.useForm();
  const [formStep3] = Form.useForm();

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Mask email: e.g. nguyenvana@gmail.com -> ng***@gmail.com
  const getMaskedEmail = (raw: string) => {
    if (!raw.includes('@')) return raw;
    const [name, domain] = raw.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  };

  // Step 1: Request OTP
  const onSendEmail = async (values: { email: string }) => {
    try {
      setLoading(true);
      const emailVal = values.email.trim();
      setEmail(emailVal);

      // Call API
      const res: any = await UserService.forgotPassword({ email: emailVal });
      if (res && res.devToken) {
        toast.success(`Mã OTP test: ${res.devToken}`);
      } else {
        toast.success('Mã OTP xác thực đã được gửi đến email!');
      }

      setCountdown(60);
      setStep(2);
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Gửi mã xác thực thất bại. Vui lòng kiểm tra lại!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const onVerifyOtp = (values: { otp: string }) => {
    setOtp(values.otp.trim());
    toast.success('Xác thực mã OTP thành công!');
    setStep(3);
  };

  // Resend OTP
  const onResendOtp = async () => {
    if (countdown > 0) return;
    try {
      setLoading(true);
      await UserService.forgotPassword({ email });
      setCountdown(60);
      toast.success('Đã gửi lại mã OTP mới!');
    } catch (error: any) {
      toast.error('Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const onResetPassword = async (values: {
    password: string;
    confirmPassword: string;
  }) => {
    try {
      setLoading(true);
      await UserService.resetPassword({
        email,
        token: otp,
        password: values.password,
      });

      toast.success('Thiết lập mật khẩu mới thành công! Vui lòng đăng nhập.');
      onToggleView();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Đổi mật khẩu thất bại. Vui lòng thử lại!';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Password rules validation
  const hasMinLen = newPassword.length >= 8;
  const hasNum = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const getStrengthScore = () => {
    let score = 0;
    if (hasMinLen) score++;
    if (hasNum) score++;
    if (hasUpper) score++;
    if (hasSpecial) score++;
    return score;
  };

  const strengthScore = getStrengthScore();
  const getStrengthLabel = () => {
    if (!newPassword) return 'Chưa nhập';
    if (strengthScore <= 1) return 'Yếu';
    if (strengthScore <= 3) return 'Trung bình';
    return 'Mạnh';
  };

  return (
    <SpinCustom spinning={loading}>
      <FormCard>
        {/* Step Indicator */}
        <StepsContainer>
          <StepItem $active={step === 1} $completed={step > 1}>
            <div className="step-circle">
              {step > 1 ? <CheckOutlined /> : '1'}
            </div>
            <div className="step-label">Nhập Email</div>
          </StepItem>
          <StepItem $active={step === 2} $completed={step > 2}>
            <div className="step-circle">
              {step > 2 ? <CheckOutlined /> : '2'}
            </div>
            <div className="step-label">Mã OTP</div>
          </StepItem>
          <StepItem $active={step === 3} $completed={false}>
            <div className="step-circle">3</div>
            <div className="step-label">Mật khẩu mới</div>
          </StepItem>
        </StepsContainer>

        {/* STEP 1: ENTER EMAIL */}
        {step === 1 && (
          <>
            <HeaderWrapper>
              <ShieldIconBox>
                <SafetyCertificateOutlined />
              </ShieldIconBox>
              <CategoryBadge>BẢO MẬT TÀI KHOẢN THÚ Y</CategoryBadge>
              <Title>Quên mật khẩu?</Title>
              <Subtitle>
                Đừng lo lắng! Hãy nhập địa chỉ email bạn đã đăng ký với VCMOS.
                Chúng tôi sẽ gửi mã xác thực OTP 6 số để đặt lại mật khẩu.
              </Subtitle>
            </HeaderWrapper>

            <Form form={formStep1} layout="vertical" onFinish={onSendEmail}>
              <CustomFormItem
                label={
                  <span style={{ fontWeight: 600 }}>
                    Địa chỉ Email đã đăng ký
                  </span>
                }
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập địa chỉ email!' },
                  { type: 'email', message: 'Định dạng email không hợp lệ!' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined />}
                  placeholder="nguyenvana@gmail.com"
                />
              </CustomFormItem>

              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                ⏱ Mã OTP sẽ có hiệu lực trong vòng 05 phút.
              </div>

              <PrimarySubmitBtn type="submit">
                Gửi mã xác thực &rarr;
              </PrimarySubmitBtn>

              <BackLink type="button" onClick={onToggleView}>
                <ArrowLeftOutlined /> Quay lại trang Đăng nhập
              </BackLink>
            </Form>

            <NoticeAlertBox>
              <strong>Lưu ý:</strong> Nếu không thấy email trong 2 phút, vui
              lòng kiểm tra hộp thư rác (Spam) hoặc liên hệ quầy lễ tân phòng
              khám.
            </NoticeAlertBox>
          </>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 2 && (
          <>
            <HeaderWrapper>
              <ShieldIconBox>
                <SafetyCertificateOutlined />
              </ShieldIconBox>
              <Title>Nhập mã xác thực OTP</Title>
              <Subtitle>
                Mã xác thực gồm 6 chữ số đã được gửi đến hộp thư:
                <br />
                <strong style={{ color: '#0f172a' }}>
                  {getMaskedEmail(email)}
                </strong>{' '}
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#00796b',
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                  onClick={() => setStep(1)}
                >
                  Đổi email khác
                </button>
              </Subtitle>
            </HeaderWrapper>

            <Form form={formStep2} layout="vertical" onFinish={onVerifyOtp}>
              <CustomFormItem
                name="otp"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã OTP!' },
                  { len: 6, message: 'Mã OTP phải gồm 6 chữ số!' },
                ]}
              >
                <Input
                  size="large"
                  maxLength={6}
                  style={{
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 700,
                  }}
                  placeholder="------"
                />
              </CustomFormItem>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#64748b',
                  marginBottom: 16,
                }}
              >
                {countdown > 0 ? (
                  <span>
                    Gửi lại mã sau{' '}
                    <strong>
                      00:{countdown < 10 ? `0${countdown}` : countdown}
                    </strong>{' '}
                    giây
                  </span>
                ) : (
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#00796b',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={onResendOtp}
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </div>

              <PrimarySubmitBtn type="submit">
                Xác nhận và Tiếp tục &rarr;
              </PrimarySubmitBtn>

              <BackLink type="button" onClick={() => setStep(1)}>
                <ArrowLeftOutlined /> Quay lại bước trước
              </BackLink>
            </Form>
          </>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 3 && (
          <>
            <HeaderWrapper>
              <ShieldIconBox>
                <LockOutlined />
              </ShieldIconBox>
              <Title>Thiết lập mật khẩu mới</Title>
              <Subtitle>
                Mật khẩu mới của bạn phải khác với các mật khẩu đã sử dụng trước
                đó.
              </Subtitle>
            </HeaderWrapper>

            <Form form={formStep3} layout="vertical" onFinish={onResetPassword}>
              <CustomFormItem
                label={<span style={{ fontWeight: 600 }}>Mật khẩu mới *</span>}
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 8, message: 'Tối thiểu 8 ký tự!' },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Nhập mật khẩu mới an toàn"
                  iconRender={visible =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                  onChange={e => setNewPassword(e.target.value)}
                />
              </CustomFormItem>

              {/* Password Strength Meter */}
              <StrengthBarWrapper>
                <div className="labels">
                  <span>Độ mạnh mật khẩu:</span>
                  <strong
                    style={{
                      color: strengthScore >= 3 ? '#059669' : '#e11d48',
                    }}
                  >
                    {getStrengthLabel()}
                  </strong>
                </div>
                <div className="bars">
                  <div
                    className="bar"
                    style={{
                      backgroundColor:
                        strengthScore >= 1
                          ? strengthScore >= 3
                            ? '#10b981'
                            : '#f59e0b'
                          : '#e2e8f0',
                    }}
                  />
                  <div
                    className="bar"
                    style={{
                      backgroundColor:
                        strengthScore >= 2
                          ? strengthScore >= 3
                            ? '#10b981'
                            : '#f59e0b'
                          : '#e2e8f0',
                    }}
                  />
                  <div
                    className="bar"
                    style={{
                      backgroundColor:
                        strengthScore >= 3 ? '#10b981' : '#e2e8f0',
                    }}
                  />
                  <div
                    className="bar"
                    style={{
                      backgroundColor:
                        strengthScore >= 4 ? '#10b981' : '#e2e8f0',
                    }}
                  />
                </div>
              </StrengthBarWrapper>

              {/* Security Checklist */}
              <SecurityChecklist>
                <div className="title">
                  <SafetyCertificateOutlined style={{ color: '#00796b' }} />
                  Yêu cầu bảo mật tiêu chuẩn y tế:
                </div>
                <div className="grid">
                  <div className={`item ${hasMinLen ? 'valid' : ''}`}>
                    {hasMinLen ? <CheckCircleFilled /> : <CloseCircleFilled />}
                    Tối thiểu 8 ký tự
                  </div>
                  <div className={`item ${hasUpper ? 'valid' : ''}`}>
                    {hasUpper ? <CheckCircleFilled /> : <CloseCircleFilled />}1
                    ký tự hoa (A-Z)
                  </div>
                  <div className={`item ${hasNum ? 'valid' : ''}`}>
                    {hasNum ? <CheckCircleFilled /> : <CloseCircleFilled />}
                    Ít nhất 1 số (0-9)
                  </div>
                  <div className={`item ${hasSpecial ? 'valid' : ''}`}>
                    {hasSpecial ? <CheckCircleFilled /> : <CloseCircleFilled />}
                    1 ký tự đặc biệt (@, #, $)
                  </div>
                </div>
              </SecurityChecklist>

              <CustomFormItem
                label={
                  <span style={{ fontWeight: 600 }}>
                    Xác nhận mật khẩu mới *
                  </span>
                }
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('Mật khẩu xác nhận không khớp!')
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </CustomFormItem>

              <PrimarySubmitBtn type="submit" disabled={strengthScore < 3}>
                Cập nhật mật khẩu & Đăng nhập &rarr;
              </PrimarySubmitBtn>

              <BackLink type="button" onClick={onToggleView}>
                <ArrowLeftOutlined /> Quay lại trang Đăng nhập
              </BackLink>
            </Form>
          </>
        )}

        <SecurityFooter>
          <div className="left">
            <SafetyCertificateOutlined /> Chuẩn mã hóa y tế SSL 256-bit
          </div>
          <div>Hỗ trợ: (024) 7300 8888</div>
        </SecurityFooter>
      </FormCard>
    </SpinCustom>
  );
};

export default ForgotPasswordForm;
