import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  Typography,
  Descriptions,
  Spin,
  Avatar,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Timeline,
  Table,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import UserService from '@/services/UserService';
import { useAuth } from '@/contexts/routerProvider/authContext';
import { toast } from 'sonner';
import { STORAGE, storage } from '@/lib/storage';

const { Title } = Typography;

const ProfileWrapper = styled.div`
  padding: 32px 24px;
  max-width: 1080px;
  margin: 0 auto;
`;

const ProfileCard = styled(Card)`
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  margin-bottom: 32px;

  .ant-card-body {
    padding: 32px;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;

  .user-info {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .meta {
    h3 {
      margin: 0 0 4px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
    }
    p {
      margin: 0 0 6px 0;
      color: #64748b;
      font-size: 13.5px;
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const EditProfileBtn = styled(Button)`
  border-radius: 8px;
  font-weight: 600;
  background-color: #0d9488 !important;
  border-color: #0d9488 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: #0f766e !important;
    border-color: #0f766e !important;
    transform: translateY(-1px);
  }
`;

// Pet Profile Card & Timeline
const PetProfileBox = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;

  .pet-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;

    .pet-identity {
      display: flex;
      align-items: center;
      gap: 16px;

      .pet-avatar {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        background: #f0fdfa;
        color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        border: 1.5px solid #ccfbf1;
      }

      .pet-details {
        h4 {
          margin: 0 0 2px 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        span {
          font-size: 13px;
          color: #64748b;
        }
      }
    }

    .badge-wrap {
      display: flex;
      gap: 8px;
    }
  }

  .pet-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 24px;

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .metric {
      .label {
        font-size: 11.5px;
        color: #64748b;
        margin-bottom: 2px;
      }
      .val {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
    }
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 750;
      color: #0f172a;
    }
  }
`;

const MilestoneCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 8px;
  transition: all 0.15s;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .m-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .m-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .m-status {
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: #dcfce7;
      color: #15803d;
    }
  }

  .m-body {
    font-size: 13px;
    color: #475569;
    margin-bottom: 12px;
  }

  .m-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px dashed #f1f5f9;
    font-size: 12.5px;

    .actions {
      display: flex;
      gap: 10px;

      .btn-m-action {
        background: transparent;
        border: 1px solid #cbd5e1;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        color: #334155;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.15s;

        &:hover {
          border-color: #0d9488;
          color: #0d9488;
        }

        &.primary {
          background: #f0fdfa;
          border-color: #ccfbf1;
          color: #0f766e;
        }
      }
    }
  }
`;

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSoapModalOpen, setIsSoapModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchProfile = () => {
    setLoading(true);
    UserService.getMyProfile()
      .then((res: any) => {
        if (res && res.user) {
          setProfile(res.user);
          const currentInfo = storage.getLocalStorage<any>(STORAGE.USER_INFO);
          if (currentInfo) {
            const updated = { ...currentInfo, ...res.user };
            storage.setLocalStorage(STORAGE.USER_INFO, updated);
            setUser(updated);
          }
        }
      })
      .catch((err: any) => {
        console.error('Fetch profile error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const openEditModal = () => {
    form.setFieldsValue({
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email ? values.email.trim() : '',
      };

      const res: any = await UserService.updateMyProfile(payload);
      if (res && res.user) {
        setProfile(res.user);
        toast.success('Cập nhật thông tin cá nhân thành công (MSG17)!');
        setIsEditModalOpen(false);

        const currentInfo = storage.getLocalStorage<any>(STORAGE.USER_INFO);
        if (currentInfo) {
          const updated = { ...currentInfo, ...res.user };
          storage.setLocalStorage(STORAGE.USER_INFO, updated);
          setUser(updated);
        }
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Cập nhật thất bại. Vui lòng kiểm tra lại thông tin!';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareToCommunity = () => {
    toast.success(
      'Bài chia sẻ hành trình điều trị đã được gửi tới ban kiểm duyệt (MSG32)!'
    );
  };

  return (
    <ProfileWrapper>
      <Title
        level={3}
        style={{ marginBottom: 24, color: '#0f172a', fontWeight: 800 }}
      >
        Hồ Sơ Chủ Nuôi & Bệnh Án Thú Cưng
      </Title>

      {/* User Information Card */}
      <ProfileCard>
        {loading && !profile ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <ProfileHeader>
              <div className="user-info">
                <Avatar
                  size={76}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#0d9488',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
                  }}
                />
                <div className="meta">
                  <h3>{profile?.fullName || 'Nguyen Van A'}</h3>
                  <p>
                    {profile?.email || 'owner@vcmos.com'} ·{' '}
                    {profile?.phone || '0901000001'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tag
                      color="cyan"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      Mã: {profile?.code || 'USR-000001'}
                    </Tag>
                    <Tag
                      color="teal"
                      style={{ borderRadius: 6, fontWeight: 600 }}
                    >
                      {profile?.role || 'PetOwner'}
                    </Tag>
                    <Tag
                      color="green"
                      icon={<CheckCircleOutlined />}
                      style={{ borderRadius: 6 }}
                    >
                      Active
                    </Tag>
                  </div>
                </div>
              </div>

              <EditProfileBtn
                type="primary"
                icon={<EditOutlined />}
                size="large"
                onClick={openEditModal}
              >
                Chỉnh sửa thông tin
              </EditProfileBtn>
            </ProfileHeader>

            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              labelStyle={{ fontWeight: 600, color: '#475569', width: '25%' }}
              contentStyle={{ color: '#0f172a' }}
            >
              <Descriptions.Item label="Mã thành viên">
                <Tag color="blue" style={{ fontWeight: 700 }}>
                  <IdcardOutlined style={{ marginRight: 6 }} />
                  {profile?.code || 'USR-000001'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Họ và tên">
                <strong>{profile?.fullName || 'Nguyen Van A'}</strong>
              </Descriptions.Item>

              <Descriptions.Item label="Số điện thoại">
                <PhoneOutlined style={{ marginRight: 6, color: '#0d9488' }} />
                {profile?.phone || '0901000001'}
              </Descriptions.Item>

              <Descriptions.Item label="Email xác thực">
                <MailOutlined style={{ marginRight: 6, color: '#0d9488' }} />
                {profile?.email || 'owner@vcmos.com'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </ProfileCard>

      {/* Pet Profile & Unified Medical Timeline */}
      <Title
        level={4}
        style={{ marginBottom: 16, color: '#0f172a', fontWeight: 800 }}
      >
        Hồ Sơ Thú Cưng & Dòng Thời Gian Bệnh Án Điện Tử
      </Title>

      <PetProfileBox>
        <div className="pet-top">
          <div className="pet-identity">
            <div className="pet-avatar">🐕</div>
            <div className="pet-details">
              <h4>Bé Milo · Mã PET-000001</h4>
              <span>
                Chó Poodle · Giới tính: Đực · Ngày sinh: 01/05/2023 (3 tuổi)
              </span>
            </div>
          </div>
          <div className="badge-wrap">
            <Tag color="magenta">Dị ứng hải sản</Tag>
            <Tag color="green">Đang điều trị nội trú (C-01)</Tag>
          </div>
        </div>

        <div className="pet-metrics-grid">
          <div className="metric">
            <div className="label">Thể trọng hiện tại</div>
            <div className="val">5.2 kg</div>
          </div>
          <div className="metric">
            <div className="label">Màu lông</div>
            <div className="val">Nâu đỏ (Brown)</div>
          </div>
          <div className="metric">
            <div className="label">Bác sĩ phụ trách</div>
            <div className="val">BS. Trần Thị B</div>
          </div>
          <div className="metric">
            <div className="label">Lần khám gần nhất</div>
            <div className="val">25/10/2026</div>
          </div>
        </div>

        <div className="timeline-header">
          <h4>Dòng thời gian y khoa hợp nhất (Unified EMR Timeline)</h4>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Hợp nhất Khám - Grooming - Nội trú - Hoá đơn
          </span>
        </div>

        <Timeline
          items={[
            {
              color: '#0d9488',
              children: (
                <MilestoneCard>
                  <div className="m-header">
                    <div className="m-title">
                      Khám Lâm Sàng Tổng Quát & Điều Trị Viêm Dạ Dày Ruột Cấp
                    </div>
                    <span className="m-status">Đã hoàn tất (Done)</span>
                  </div>
                  <div className="m-body">
                    Thời gian: <strong>25/10/2026</strong> · Bác sĩ thực hiện:{' '}
                    <strong>BS. Trần Thị B (vet@vcmos.com)</strong>
                    <br />
                    Chẩn đoán xác định: Viêm dạ dày ruột cấp tính, chỉ định nhập
                    viện theo dõi Chuồng C-01 và dùng kháng sinh Amoxicillin 5
                    ngày.
                  </div>
                  <div className="m-footer">
                    <div style={{ color: '#0d9488', fontWeight: 600 }}>
                      Mã phiếu khám: #EMR-20261025-01
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn-m-action primary"
                        onClick={() => setIsSoapModalOpen(true)}
                      >
                        <FileTextOutlined /> Xem bệnh án SOAP
                      </button>
                      <button
                        type="button"
                        className="btn-m-action"
                        onClick={() => setIsInvoiceModalOpen(true)}
                      >
                        <DollarOutlined /> Xem hoá đơn
                      </button>
                      <button
                        type="button"
                        className="btn-m-action"
                        onClick={handleShareToCommunity}
                      >
                        <ShareAltOutlined /> Chia sẻ lên Cộng đồng (UC-49)
                      </button>
                    </div>
                  </div>
                </MilestoneCard>
              ),
            },
            {
              color: '#0284c7',
              children: (
                <MilestoneCard>
                  <div className="m-header">
                    <div className="m-title">
                      Tiêm Chủng Vaccine 7 Bệnh & Sổ Giun Định Kỳ
                    </div>
                    <span className="m-status">Đã hoàn tất (Done)</span>
                  </div>
                  <div className="m-body">
                    Thời gian: <strong>15/09/2026</strong> · Bác sĩ:{' '}
                    <strong>BS. Trần Thị B</strong>
                    <br />
                    Thực hiện tiêm vaccine đa giá phòng 7 bệnh truyền nhiễm chó
                    mèo. Tự động đồng bộ lịch tái chủng sau 12 tháng.
                  </div>
                  <div className="m-footer">
                    <div style={{ color: '#64748b' }}>
                      Vaccine lô: GSP-2026-08A
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn-m-action"
                        onClick={() =>
                          toast.info('Sổ tiêm chủng điện tử đã được ghi nhận')
                        }
                      >
                        <SafetyCertificateOutlined /> Sổ tiêm chủng
                      </button>
                    </div>
                  </div>
                </MilestoneCard>
              ),
            },
            {
              color: '#d97706',
              children: (
                <MilestoneCard>
                  <div className="m-header">
                    <div className="m-title">
                      Grooming Spa & Cắt Tỉa Lông Thẩm Mỹ Chuẩn Giống
                    </div>
                    <span className="m-status">Đã hoàn tất (Done)</span>
                  </div>
                  <div className="m-body">
                    Thời gian: <strong>01/08/2026</strong> · Groomer:{' '}
                    <strong>Chuyên viên Lê Thị D</strong>
                    <br />
                    Tắm sấy dưỡng lông thảo dược, cắt tỉa form gấu bông, vệ sinh
                    tai và cắt dũa móng an toàn.
                  </div>
                  <div className="m-footer">
                    <div style={{ color: '#64748b' }}>Thời lượng: 60 phút</div>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn-m-action"
                        onClick={() =>
                          toast.info(
                            'Ghi chú grooming: Bé hợp tác, da tai sạch'
                          )
                        }
                      >
                        Ghi chú Grooming
                      </button>
                    </div>
                  </div>
                </MilestoneCard>
              ),
            },
          ]}
        />
      </PetProfileBox>

      {/* Edit Profile Modal */}
      <Modal
        title="Chỉnh Sửa Thông Tin Cá Nhân"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item name="email" label="Địa chỉ Email">
            <Input size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
            size="large"
            style={{ background: '#0d9488', marginTop: 12 }}
          >
            Lưu thay đổi
          </Button>
        </Form>
      </Modal>

      {/* View SOAP Medical Record Modal */}
      <Modal
        title="Bệnh Án Điện Tử SOAP Chuẩn Y Khoa"
        open={isSoapModalOpen}
        onCancel={() => setIsSoapModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsSoapModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => toast.success('Đang tạo tệp PDF bệnh án điện tử...')}
          >
            Xuất file PDF bệnh án
          </Button>,
        ]}
        width={700}
      >
        <div style={{ padding: '8px 0', fontSize: 13.5 }}>
          <div
            style={{
              background: '#f8fafc',
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div>
              Bệnh nhân: <strong>Bé Milo (Chó Poodle · 5.2 kg)</strong> · Chủ
              nuôi: <strong>Nguyen Van A</strong>
            </div>
            <div>
              Bác sĩ khám: <strong>BS. Trần Thị B</strong> · Ngày khám:{' '}
              <strong>25/10/2026</strong>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              S - SUBJECTIVE (Triệu chứng cơ năng theo lời chủ báo):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Chủ báo bé bỏ ăn 2 ngày nay, nôn nhẹ dịch bọt trắng buổi sáng, uể
              oải, ít vận động so với ngày thường.
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              O - OBJECTIVE (Dấu hiệu thực thể qua thăm khám lâm sàng):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Nhiệt độ 39.5°C, niêm mạc nhạt nhẹ, nhịp thở 28 lần/phút, bụng mềm
              không chướng căng. Xét nghiệm máu: Bạch cầu tăng nhẹ.
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              A - ASSESSMENT (Chẩn đoán xác định):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Viêm dạ dày ruột cấp tính (Acute Gastroenteritis).
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: '#0d9488' }}>
              P - PLAN (Phác đồ điều trị & Đơn thuốc kê toa):
            </div>
            <div style={{ color: '#334155', marginTop: 4 }}>
              Nhập viện theo dõi Chuồng C-01, truyền dịch cân bằng điện giải,
              dùng kháng sinh Amoxicillin 250mg trong 5 ngày.
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Đơn thuốc chỉ định:
            </div>
            <Table
              size="small"
              pagination={false}
              columns={[
                { title: 'Thuốc / Sản phẩm', dataIndex: 'name', key: 'name' },
                { title: 'Liều lượng', dataIndex: 'dose', key: 'dose' },
                { title: 'Tần suất', dataIndex: 'freq', key: 'freq' },
                { title: 'Số lượng', dataIndex: 'qty', key: 'qty' },
              ]}
              dataSource={[
                {
                  key: '1',
                  name: 'Amoxicillin 250mg',
                  dose: '1 viên',
                  freq: '2 lần/ngày (sau ăn)',
                  qty: '10 viên',
                },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        title="Hoá Đơn Dịch Vụ Khám & Điều Trị"
        open={isInvoiceModalOpen}
        onCancel={() => setIsInvoiceModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsInvoiceModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="download"
            type="primary"
            style={{ background: '#0d9488' }}
            onClick={() => toast.success('Đã tải hóa đơn điện tử (PDF)')}
          >
            Tải hoá đơn PDF
          </Button>,
        ]}
        width={650}
      >
        <div style={{ padding: '8px 0', fontSize: 13.5 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div>
              Mã hoá đơn: <strong>#INV-20261025-01</strong>
              <br />
              Thú cưng: <strong>Bé Milo</strong> (PET-000001)
            </div>
            <div style={{ textAlign: 'right' }}>
              Ngày xuất: <strong>25/10/2026</strong>
              <br />
              Trạng thái: <Tag color="green">Đã thanh toán (Paid)</Tag>
            </div>
          </div>

          <Table
            size="small"
            pagination={false}
            columns={[
              { title: 'Khoản mục', dataIndex: 'item', key: 'item' },
              { title: 'Đơn giá', dataIndex: 'price', key: 'price' },
              { title: 'SL', dataIndex: 'qty', key: 'qty' },
              { title: 'Thành tiền', dataIndex: 'total', key: 'total' },
            ]}
            dataSource={[
              {
                key: '1',
                item: 'Khám lâm sàng tổng quát',
                price: '150.000đ',
                qty: 1,
                total: '150.000đ',
              },
              {
                key: '2',
                item: 'Thuốc Amoxicillin 250mg (vỉ)',
                price: '5.000đ',
                qty: 10,
                total: '50.000đ',
              },
            ]}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 18,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            <span>Phương thức: Tiền mặt (Cash) / VNPay QR</span>
            <span style={{ color: '#0d9488' }}>Tổng cộng: 200.000đ</span>
          </div>
        </div>
      </Modal>
    </ProfileWrapper>
  );
};

export default ProfilePage;
