import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 820px;
  margin: 0 auto 40px auto;

  .top-tag {
    font-size: 12px;
    font-weight: 800;
    color: #00796b;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  h2 {
    font-size: 36px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 12px 0;
    letter-spacing: -0.6px;
  }

  p {
    font-size: 16px;
    color: #64748b;
    margin: 0;
    line-height: 1.6;
  }
`;

const DoctorsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const DoctorCard = styled.div`
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0, 77, 64, 0.08);
    border-color: #b2dfdb;
  }

  .image-wrapper {
    position: relative;
    height: 260px;
    background: #f1f5f9;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .exp-badge {
      position: absolute;
      top: 14px;
      right: 14px;
      background: #00796b;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 9999px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }

    .dept-badge {
      position: absolute;
      bottom: 14px;
      left: 14px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 8px;
    }
  }

  .card-body {
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    flex: 1;

    .name {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .title {
      font-size: 13.5px;
      font-weight: 700;
      color: #00796b;
      margin: 0 0 12px 0;
    }

    .bio {
      font-size: 13px;
      color: #64748b;
      line-height: 1.55;
      margin: 0 0 20px 0;
      flex: 1;
    }

    .schedule-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12.5px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;

      svg {
        color: #d97706;
      }
    }

    .btn-book-doctor {
      height: 44px;
      border-radius: 12px;
      border: 1.5px solid #00796b;
      color: #00796b;
      font-weight: 700;
      background: #ffffff;
      transition: all 0.2s;

      &:hover {
        background: #00695c !important;
        border-color: #00695c !important;
        color: #ffffff !important;
      }
    }
  }
`;

interface DoctorsSectionProps {
  onSelectDoctor?: (doctorName: string) => void;
}

const DoctorsSection: React.FC<DoctorsSectionProps> = ({ onSelectDoctor }) => {
  const doctors = [
    {
      name: 'BS. CKI. Nguyễn Văn Hoàng',
      exp: '12 Năm Kinh Nghiệm',
      dept: 'Khoa Ngoại & Xương khớp',
      title: 'Trưởng khoa Ngoại & Phẫu thuật xương khớp',
      bio: 'Chuyên gia đầu ngành về kết hợp xương xâm lấn tối thiểu, phẫu thuật thoát vị đĩa đệm và chấn thương chỉnh hình thú nhỏ. Đã thực hiện thành công hơn 3.500 ca mổ phức tạp.',
      schedule: 'Lịch trực tuần: Thứ 2, 4, 6 & CN (Cơ sở Cầu Giấy)',
      image:
        'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'ThS. BS. Lê Thị Minh Thư',
      exp: '9 Năm Kinh Nghiệm',
      dept: 'Da liễu & Nội Tiết Thú Nhỏ',
      title: 'Chuyên gia Da liễu & Dị ứng miễn dịch',
      bio: 'Tốt nghiệp Thạc sĩ Thú y tại Đại học Nông Lâm và tu nghiệp chuyên sâu tại Viện Thú y Bangkok (Thái Lan). Chuyên trị các ca viêm da cơ địa dai dẳng, viêm tai mạn tính và rối loạn hormone.',
      schedule: 'Lịch trực tuần: Thứ 3, 5, 7 (Cơ sở Đống Đa)',
      image:
        'https://images.unsplash.com/photo-1594824813589-354924a35f08?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'BS. Trần Tuấn Nam',
      exp: '10 Năm Kinh Nghiệm',
      dept: 'Chẩn Đoán Hình Ảnh & Cấp Cứu',
      title: 'Trưởng phòng Chẩn đoán hình ảnh & Cấp cứu 24/7',
      bio: 'Chuyên gia chẩn đoán siêu âm tim Doppler màu mạch máu, nội soi tiêu hóa can thiệp dị vật và hồi sức tích cực (ICU). Luôn dẫn đầu đội ngũ cấp cứu ban đêm.',
      schedule: 'Lịch trực tuần: Túc trực ICU & Ca đêm 24/7',
      image:
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <SectionWrapper>
      <SectionHeader>
        <div className="top-tag">CHUYÊN MÔN HÀNG ĐẦU</div>
        <h2>Đội Ngũ Bác Sĩ Thú Y Tận Tâm & Giàu Kinh Nghiệm</h2>
        <p>
          100% Bác sĩ tốt nghiệp Đại học Y Dược & Nông Nghiệp, sở hữu chứng chỉ
          hành nghề quốc tế với hơn 8 - 15 năm kinh nghiệm điều trị lâm sàng.
        </p>
      </SectionHeader>

      <DoctorsGrid>
        {doctors.map(doc => (
          <DoctorCard key={doc.name}>
            <div className="image-wrapper">
              <img src={doc.image} alt={doc.name} />
              <div className="exp-badge">{doc.exp}</div>
              <div className="dept-badge">{doc.dept}</div>
            </div>

            <div className="card-body">
              <h3 className="name">{doc.name}</h3>
              <div className="title">{doc.title}</div>
              <p className="bio">{doc.bio}</p>

              <div className="schedule-box">
                <ClockCircleOutlined />
                <span>{doc.schedule}</span>
              </div>

              <Button
                className="btn-book-doctor"
                icon={<UserOutlined />}
                onClick={() => onSelectDoctor?.(doc.name)}
              >
                Đặt hẹn khám với {doc.name.split('. ').pop()}
              </Button>
            </div>
          </DoctorCard>
        ))}
      </DoctorsGrid>
    </SectionWrapper>
  );
};

export default DoctorsSection;
