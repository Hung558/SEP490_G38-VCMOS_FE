import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Form, Input, Select } from 'antd';
import {
  CheckCircleOutlined,
  CalendarOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 80px 24px;
`;

const BannerCard = styled.div`
  background: #004d40;
  background: linear-gradient(135deg, #004d40 0%, #00695c 100%);
  border-radius: 32px;
  padding: 48px;
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 48px;
  align-items: center;
  box-shadow: 0 20px 60px rgba(0, 77, 64, 0.2);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 32px 24px;
    gap: 36px;
  }
`;

const LeftInfo = styled.div`
  color: #ffffff;

  .offer-badge {
    display: inline-block;
    padding: 5px 14px;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 38px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.25;
    margin: 0 0 20px 0;
    letter-spacing: -0.8px;

    @media (max-width: 640px) {
      font-size: 28px;
    }
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
    margin: 0 0 32px 0;
  }

  .perks {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    .perk-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #e0f2f1;

      svg {
        color: #4ade80;
        font-size: 16px;
      }
    }
  }
`;

const FormBox = styled.div`
  background: #ffffff;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);

  @media (max-width: 640px) {
    padding: 24px 20px;
  }

  .form-header {
    margin-bottom: 24px;

    h3 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

  .ant-form-item-label > label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }

  .ant-input,
  .ant-select-selector {
    border-radius: 10px !important;
    background-color: #f8fafc !important;
    border: 1px solid #cbd5e1 !important;
  }

  .btn-submit {
    width: 100%;
    height: 52px;
    background: #004d40;
    border-color: #004d40;
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    border-radius: 12px;
    letter-spacing: 0.5px;
    margin-top: 8px;
    transition: all 0.2s;

    &:hover {
      background: #00695c !important;
      border-color: #00695c !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 77, 64, 0.3);
    }
  }
`;

const QuickBookingSection: React.FC = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = (values: any) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(
        `Đã ghi nhận yêu cầu đặt lịch cho ${values.petInfo}! Tổng đài VCMOS sẽ liên hệ trong 5 phút.`
      );
      form.resetFields();
    }, 600);
  };

  return (
    <SectionWrapper id="quick-booking">
      <BannerCard>
        <LeftInfo>
          <div className="offer-badge">ƯU ĐÃI THÀNH VIÊN MỚI</div>
          <h2>Sẵn Sàng Trao Gửi Yêu Thương & Sức Khỏe Cho Bé Cưng Của Bạn?</h2>
          <p>
            Tải ứng dụng VCMOS hoặc Đặt lịch hẹn khám ngay hôm nay để nhận Sổ
            khám sức khỏe điện tử miễn phí trọn đời và gói tầm soát ký sinh
            trùng sơ bộ.
          </p>

          <div className="perks">
            <div className="perk-item">
              <CheckCircleOutlined /> Xác nhận hẹn trong 5 phút
            </div>
            <div className="perk-item">
              <CheckCircleOutlined /> Không cần đặt cọc trước
            </div>
          </div>
        </LeftInfo>

        <FormBox>
          <div className="form-header">
            <h3>
              <CalendarOutlined style={{ color: '#00796b' }} />
              Đặt Lịch Khám Ưu Tiên Nhanh
            </h3>
            <p>
              Hệ thống sẽ giữ lịch khám đúng bác sĩ yêu cầu và nhắc lịch qua
              Zalo/SMS.
            </p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              facility: 'cau-giay',
              serviceType: 'examination',
              dateTime: 'Hôm nay - Ca sớm nhất',
            }}
          >
            <Form.Item
              name="facility"
              label="Chọn cơ sở VCMOS gần bạn nhất"
              rules={[{ required: true, message: 'Vui lòng chọn cơ sở!' }]}
            >
              <Select size="large">
                <Select.Option value="cau-giay">
                  Cơ sở 1: Tòa VCMOS Complex, 126 Cầu Giấy, Q. Cầu Giấy
                </Select.Option>
                <Select.Option value="dong-da">
                  Cơ sở 2: Số 45 Hoàng Cầu, Q. Đống Đa
                </Select.Option>
                <Select.Option value="tay-ho">
                  Cơ sở 3: Số 88 Xuân Diệu, Q. Tây Hồ
                </Select.Option>
              </Select>
            </Form.Item>

            <div className="form-grid-2">
              <Form.Item
                name="dateTime"
                label="Ngày & Giờ mong muốn"
                rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}
              >
                <Input
                  size="large"
                  placeholder="VD: 09:00 sáng mai"
                  prefix={<CalendarOutlined style={{ color: '#94a3b8' }} />}
                />
              </Form.Item>

              <Form.Item
                name="serviceType"
                label="Loại dịch vụ"
                rules={[{ required: true, message: 'Vui lòng chọn dịch vụ!' }]}
              >
                <Select size="large">
                  <Select.Option value="examination">
                    Khám bệnh / Xét nghiệm
                  </Select.Option>
                  <Select.Option value="grooming">
                    Spa & Cắt tỉa Grooming
                  </Select.Option>
                  <Select.Option value="vaccine">
                    Tiêm phòng Vắc-xin
                  </Select.Option>
                  <Select.Option value="inpatient">
                    Nhập viện điều trị
                  </Select.Option>
                </Select>
              </Form.Item>
            </div>

            <div className="form-grid-2">
              <Form.Item
                name="phone"
                label="Số điện thoại phụ huynh *"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại!' },
                  {
                    pattern: /^0\d{9}$/,
                    message: 'SĐT gồm 10 số, bắt đầu bằng 0!',
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="VD: 0902 099 905"
                  prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                />
              </Form.Item>

              <Form.Item
                name="petInfo"
                label="Tên & Giống thú cưng *"
                rules={[{ required: true, message: 'Vui lòng nhập tên bé!' }]}
              >
                <Input size="large" placeholder="VD: Bé Corgi Mochi (3kg)" />
              </Form.Item>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              className="btn-submit"
              loading={submitting}
            >
              ✓ XÁC NHẬN ĐẶT LỊCH TRONG 30 GIÂY
            </Button>
          </Form>
        </FormBox>
      </BannerCard>
    </SectionWrapper>
  );
};

export default QuickBookingSection;
