import React from 'react';
import styled from 'styled-components';
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 64px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 52px auto;

  .section-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #0d9488;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    padding: 5px 14px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 14px;
  }

  h2 {
    font-size: 36px;
    font-weight: 850;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 0 0 14px 0;

    @media (max-width: 640px) {
      font-size: 28px;
    }
  }

  p {
    font-size: 16px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }
`;

const DoctorsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const DoctorCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .avatar-wrap {
    height: 220px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .verified-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #0f766e;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .card-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    flex: 1;

    h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .specialty {
      font-size: 13.5px;
      font-weight: 600;
      color: #0d9488;
      margin-bottom: 16px;
    }

    .bio {
      font-size: 13.5px;
      color: #64748b;
      line-height: 1.55;
      margin: 0 0 20px 0;
      flex: 1;
    }

    .meta-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12.5px;
      color: #475569;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      margin-bottom: 20px;

      .item {
        display: flex;
        align-items: center;
        gap: 8px;

        .icon {
          color: #0d9488;
          font-size: 13px;
        }
      }
    }

    .btn-book-doctor {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      height: 40px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;

      &:hover {
        background: #0d9488;
        border-color: #0d9488;
        color: #ffffff;
      }
    }
  }
`;

interface DoctorsSectionProps {
  onSelectDoctor: (doctorName?: string) => void;
}

const doctorsList = [
  {
    id: 'vet-b',
    name: 'BS. Trần Thị B',
    title: 'Bác Sĩ Chuyên Khoa Nội & Chẩn Đoán Hình Ảnh',
    image:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
    bio: 'Chuyên sâu về siêu âm Doppler màu, chẩn đoán tiêu hoá, tim mạch, điều trị các bệnh truyền nhiễm và theo dõi bệnh án điện tử.',
    experience: '8 năm kinh nghiệm lâm sàng thú y',
    schedule: 'Lịch trực: Ca sáng & Chiều các ngày trong tuần',
  },
  {
    id: 'vet-nam',
    name: 'ThS. BS. Nguyễn Hoàng Nam',
    title: 'Bác Sĩ Chuyên Khoa Ngoại & Chấn Thương Chỉnh Hình',
    image:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
    bio: 'Tốt nghiệp Thạc sĩ Thú y, giàu kinh nghiệm phẫu thuật mô mềm, kết hợp xương nẹp vít sinh học và chăm sóc ngoại khoa.',
    experience: '12 năm kinh nghiệm phẫu thuật lâm sàng',
    schedule: 'Lịch trực: Thứ 2 - Thứ 6 (Ca sáng & chiều)',
  },
  {
    id: 'groomer-d',
    name: 'Chuyên Viên Lê Thị D',
    title: 'Trưởng Nhóm Grooming Spa & Chăm Sóc Da Lông',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    bio: 'Chứng chỉ Grooming chuyên nghiệp, chuyên sâu về cắt tỉa thẩm mỹ chuẩn giống loài, phục hồi da nấm viêm nang lông và tắm sấy an toàn cho thú cưng.',
    experience: '6 năm chuyên môn Spa & Grooming thú cưng',
    schedule: 'Lịch trực: Thứ 3 - Chủ Nhật (08:30 - 18:30)',
  },
];

const DoctorsSection: React.FC<DoctorsSectionProps> = ({ onSelectDoctor }) => {
  const { isLogin } = useIsLogin();

  const handleSelectDoctor = (name: string) => {
    if (!isLogin) {
      toast.info('Vui lòng đăng nhập để đặt lịch hẹn với bác sĩ!');
      window.dispatchEvent(new CustomEvent('open-vcmos-login'));
    } else {
      onSelectDoctor(name);
    }
  };

  return (
    <SectionWrapper id="doctors">
      <SectionHeader>
        <span className="section-tag">Đội Ngũ Chuyên Môn VCMOS</span>
        <h2>Bác Sĩ Thú Y & Kỹ Thuật Viên Chuyên Trách</h2>
        <p>
          Đội ngũ bác sĩ và chuyên viên tại VCMOS đều đạt chứng chỉ hành nghề
          chính quy, giàu kinh nghiệm lâm sàng và luôn nhẹ nhàng, tận tâm với
          từng bé cưng.
        </p>
      </SectionHeader>

      <DoctorsGrid>
        {doctorsList.map(doc => (
          <DoctorCard key={doc.id}>
            <div className="avatar-wrap">
              <img src={doc.image} alt={doc.name} />
              <div className="verified-badge">
                <CheckCircleFilled style={{ color: '#10b981' }} />
                <span>Nhân sự chính quy</span>
              </div>
            </div>

            <div className="card-body">
              <h3>{doc.name}</h3>
              <div className="specialty">{doc.title}</div>
              <p className="bio">{doc.bio}</p>

              <div className="meta-list">
                <div className="item">
                  <AuditOutlined className="icon" />
                  <span>{doc.experience}</span>
                </div>
                <div className="item">
                  <ClockCircleOutlined className="icon" />
                  <span>{doc.schedule}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-book-doctor"
                onClick={() => handleSelectDoctor(doc.name)}
              >
                <CalendarOutlined /> Đặt lịch với chuyên gia này
              </button>
            </div>
          </DoctorCard>
        ))}
      </DoctorsGrid>
    </SectionWrapper>
  );
};

export default DoctorsSection;
