import React, { useState } from 'react';
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
  Steps,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { useNavigate } from 'react-router-dom';
import ROUTER from '@/routerMap/ROUTER';
import { toast } from 'sonner';
import AiAssessmentSection from './components/AiAssessmentSection';

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

const StatusStepperBox = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;

  .stepper-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 13px;
    strong {
      color: #0f172a;
    }
    span {
      color: #64748b;
    }
  }

  .ant-steps-item-title {
    font-size: 12.5px !important;
    font-weight: 600;
  }
`;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInpatientModalOpen, setIsInpatientModalOpen] = useState(false);

  // Appointments adhering to SRS Order Lifecycle
  const appointmentColumns = [
    {
      title: 'Mã lượt hẹn',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <strong style={{ color: '#0d9488' }}>{code}</strong>
      ),
    },
    {
      title: 'Thú cưng & Giống',
      dataIndex: 'petName',
      key: 'petName',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{text}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{record.breed}</div>
        </div>
      ),
    },
    {
      title: 'Dịch vụ chỉ định',
      dataIndex: 'service',
      key: 'service',
    },
    {
      title: 'Bác sĩ / Nhân sự',
      dataIndex: 'doctor',
      key: 'doctor',
    },
    {
      title: 'Thời gian khám',
      dataIndex: 'datetime',
      key: 'datetime',
    },
    {
      title: 'Trạng thái chu trình',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'Booked') color = 'blue';
        if (status === 'CheckedIn') color = 'cyan';
        if (status === 'InProgress (Đang khám)') color = 'orange';
        if (status === 'WaitOwner (Chờ chủ đón)') color = 'purple';
        if (status === 'Done') color = 'green';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const appointmentData = [
    {
      key: '1',
      code: 'APT-1082',
      petName: 'Bé Milo (Mã PET-000001)',
      breed: 'Chó Poodle · 5.2 kg',
      service: 'Khám lâm sàng tổng quát & Đơn thuốc',
      doctor: 'BS. Trần Thị B (vet@vcmos.com)',
      datetime: 'Hôm nay, 14:30',
      status: 'InProgress (Đang khám)',
    },
    {
      key: '2',
      code: 'APT-1075',
      petName: 'Bé Miu',
      breed: 'Mèo Anh lông ngắn · 4.0 kg',
      service: 'Grooming Spa & Cắt tỉa lông thẩm mỹ',
      doctor: 'Chuyên viên Lê Thị D',
      datetime: 'Ngày mai, 10:00',
      status: 'Booked',
    },
    {
      key: '3',
      code: 'APT-1049',
      petName: 'Bé Milo',
      breed: 'Chó Poodle',
      service: 'Tiêm chủng Vaccine 7 bệnh định kỳ',
      doctor: 'BS. Trần Thị B',
      datetime: '15/09/2026',
      status: 'Done',
    },
  ];

  const petsColumns = [
    {
      title: 'Mã số & Tên thú cưng',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>🐾 {name}</span>
          <div style={{ fontSize: 11.5, color: '#0d9488' }}>
            Mã: {record.code}
          </div>
        </div>
      ),
    },
    {
      title: 'Loài & Giống',
      dataIndex: 'species',
      key: 'species',
    },
    {
      title: 'Thể trọng',
      dataIndex: 'weight',
      key: 'weight',
    },
    {
      title: 'Tình trạng y khoa & Dị ứng',
      dataIndex: 'medicalNote',
      key: 'medicalNote',
      render: (note: string) => (
        <span style={{ fontSize: 13, color: '#dc2626' }}>{note}</span>
      ),
    },
    {
      title: 'Thao tác nhanh',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button
            size="small"
            style={{ borderColor: '#0d9488', color: '#0d9488' }}
            onClick={() => navigate(ROUTER.PROFILE)}
          >
            Hồ sơ EMR (SOAP)
          </Button>
          <Button
            size="small"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => navigate(ROUTER.HOME + '#quick-booking')}
          >
            Đặt lịch
          </Button>
        </Space>
      ),
    },
  ];

  const petsData = [
    {
      key: '1',
      code: 'PET-000001',
      name: 'Milo',
      species: 'Chó · Poodle nâu (3 tuổi)',
      weight: '5.2 kg',
      medicalNote: 'Dị ứng hải sản; tiền sử viêm dạ dày ruột cấp',
    },
    {
      key: '2',
      code: 'PET-000002',
      name: 'Bé Miu',
      species: 'Mèo · Anh lông ngắn xám (2 tuổi)',
      weight: '4.0 kg',
      medicalNote: 'Đã hoàn tất sổ giun & vaccine 4 bệnh',
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
            Xin chào, {user?.fullName || 'Nguyen Van A'}!
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
            onClick={() => toast.info('Mở form tạo hồ sơ thú cưng mới')}
          >
            Thêm thú cưng
          </Button>
          <Button
            type="primary"
            className="btn-new-appt"
            icon={<CalendarOutlined />}
            onClick={() => navigate(ROUTER.HOME + '#quick-booking')}
          >
            + Đặt lịch hẹn mới
          </Button>
        </div>
      </div>

      {/* Inpatient Stay Banner */}
      <InpatientBanner>
        <div className="banner-left">
          <div className="icon-wrap">
            <HeartOutlined />
          </div>
          <div className="info">
            <div className="tag-row">
              <span className="badge-pulse">LƯU CHUỒNG ĐIỀU TRỊ NỘI TRÚ</span>
              <Tag color="cyan">Chuồng C-01 (Occupied)</Tag>
            </div>
            <div className="title">
              Bé Milo đang được theo dõi điều trị nội trú (Ngày thứ 2)
            </div>
            <div className="sub">
              Bác sĩ điều trị: <strong>BS. Trần Thị B</strong> · Chẩn đoán: Viêm
              dạ dày ruột cấp · Sinh hiệu: Thân nhiệt 38.6°C (Hạ sốt ổn định)
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
            <div className="num">2</div>
            <div className="sub">Bé Milo & Bé Miu</div>
          </StatCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Lịch hẹn đang xử lý</span>
              <div className="icon-box blue">
                <CalendarOutlined />
              </div>
            </div>
            <div className="num">1</div>
            <div className="sub">Hôm nay lúc 14:30 (Đang khám)</div>
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
            <div className="num">1</div>
            <div className="sub">Chuồng C-01 (Ngày 2)</div>
          </StatCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard>
            <div className="stat-header">
              <span className="label">Hồ sơ hoàn tất</span>
              <div className="icon-box green">
                <CheckCircleOutlined />
              </div>
            </div>
            <div className="num">12</div>
            <div className="sub">Đã lưu trữ bệnh án SOAP</div>
          </StatCard>
        </Col>
      </Row>

      {/* Live Order Stepper Preview (SRS Lifecycle) */}
      <StatusStepperBox>
        <div className="stepper-header">
          <div>
            <strong>Chu trình lượt hẹn trực tiếp mã #APT-1082:</strong> Bé Milo
            (Khám lâm sàng tổng quát)
          </div>
          <span>Bác sĩ phụ trách: BS. Trần Thị B</span>
        </div>
        <Steps
          size="small"
          current={2}
          items={[
            { title: 'Đã đặt (Booked)' },
            { title: 'Đã tiếp nhận (Checked In)' },
            { title: 'Đang thực hiện (In Progress)' },
            { title: 'Chờ chủ đón (Wait Owner)' },
            { title: 'Hoàn tất (Done)' },
          ]}
        />
      </StatusStepperBox>

      {/* Upcoming Appointments Table */}
      <SectionCard title="Danh Sách Lịch Hẹn & Tiến Trình Khám Lâm Sàng">
        <Table
          columns={appointmentColumns}
          dataSource={appointmentData}
          pagination={false}
          size="middle"
        />
      </SectionCard>

      {/* My Pets Table */}
      <SectionCard title="Hồ Sơ Thú Cưng Của Tôi">
        <Table
          columns={petsColumns}
          dataSource={petsData}
          pagination={false}
          size="middle"
        />
      </SectionCard>

      {/* Sàng Lọc & Đánh Giá Triệu Chứng Thú Cưng Ban Đầu (Đang phát triển) */}
      <AiAssessmentSection
        isUnderDevelopment={true}
        onBookAppointment={notes => {
          navigate(ROUTER.HOME + '#quick-booking');
          if (notes) {
            toast.info(
              'Đã chuyển tiếp thông tin triệu chứng sang luồng đặt lịch khám!'
            );
          }
        }}
      />

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
    </DashboardWrapper>
  );
};

export default DashboardPage;
