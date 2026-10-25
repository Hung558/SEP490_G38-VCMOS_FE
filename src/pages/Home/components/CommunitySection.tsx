import React, { useState } from 'react';
import styled from 'styled-components';
import {
  HeartFilled,
  HeartOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Avatar } from 'antd';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 40px;
  gap: 20px;

  .left {
    .top-tag {
      font-size: 12px;
      font-weight: 800;
      color: #00796b;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    h2 {
      font-size: 34px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 10px 0;
      letter-spacing: -0.6px;
    }

    p {
      font-size: 16px;
      color: #64748b;
      margin: 0;
    }
  }

  .see-more {
    font-size: 14.5px;
    font-weight: 700;
    color: #00796b;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    &:hover {
      color: #004d40;
      gap: 10px;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const StoriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const StoryCard = styled.div`
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
    height: 220px;
    background: #f1f5f9;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .badge-tag {
      position: absolute;
      top: 14px;
      left: 14px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
  }

  .card-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    flex: 1;

    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: #00796b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .date {
        color: #94a3b8;
        font-weight: 500;
      }
    }

    .title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }

    .story-text {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 24px 0;
      flex: 1;
      font-style: italic;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;

      .author {
        display: flex;
        align-items: center;
        gap: 10px;

        .name {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .loc {
          font-size: 11.5px;
          color: #64748b;
        }
      }

      .like-btn {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #e11d48;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.1);
        }
      }
    }
  }
`;

const CommunitySection: React.FC = () => {
  const [likes, setLikes] = useState<{
    [key: number]: { count: number; liked: boolean };
  }>({
    1: { count: 428, liked: false },
    2: { count: 356, liked: false },
    3: { count: 512, liked: false },
  });

  const toggleLike = (id: number) => {
    setLikes(prev => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked,
        },
      };
    });
  };

  const stories = [
    {
      id: 1,
      tag: 'Hồi Phục Ngoạn Mục',
      treatment: 'Ca phẫu thuật & Vật lý trị liệu',
      date: 'Tháng 2/2026',
      title: 'Bé Corgi Mochi (3 tuổi) - Chiến thắng thoát vị đĩa đệm',
      text: '“Cảm ơn bác sĩ Hoàng và toàn thể đội ngũ VCMOS đã phẫu thuật kịp thời và tận tâm giúp bé đi lại bình thường sau 3 tuần vật lý trị liệu phục hồi chức năng.”',
      author: 'Chị Mai Phương',
      location: 'Cầu Giấy, Hà Nội',
      initials: 'MP',
      avatarColor: '#00796b',
      image:
        'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 2,
      tag: 'Da Liễu Số Hóa',
      treatment: 'Điều trị nấm & Viêm da',
      date: 'Tháng 1/2026',
      title: 'Bé Mèo Bông - Dứt điểm viêm da nấm sau 14 ngày',
      text: '“Nhờ ứng dụng theo dõi hồ sơ số và đơn thuốc điện tử chi tiết có thông báo giờ bôi thuốc hàng ngày, việc chăm sóc mèo tại nhà nhàn tênh và cực kỳ yên tâm.”',
      author: 'Anh Quốc Dũng',
      location: 'Đống Đa, Hà Nội',
      initials: 'QD',
      avatarColor: '#b45309',
      image:
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 3,
      tag: 'Spa & Grooming 5 Sao',
      treatment: 'Phục hồi lông & Tạo kiểu',
      date: 'Tháng 2/2026',
      title: "Bé Poodle Lu - 'Lột xác' diện mạo sau gói Spa thảo mộc",
      text: '“Dịch vụ tỉa lông siêu êm, bạn kỹ thuật viên cực kỳ nâng niu thú cưng. Lông bé mềm mượt thơm ngát suốt cả tuần, không hề có mùi hôi như trước.”',
      author: 'Bạn Thùy Linh',
      location: 'Tây Hồ, Hà Nội',
      initials: 'TL',
      avatarColor: '#0284c7',
      image:
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <SectionWrapper>
      <SectionHeader>
        <div className="left">
          <div className="top-tag">CỘNG ĐỒNG TIN CẬY</div>
          <h2>Hành Trình Hồi Phục - Câu Chuyện Thật Từ Cộng Đồng VCMOS</h2>
          <p>
            Mỗi ca bệnh được chữa lành là một niềm hạnh phúc lớn lao được sẻ
            chia giữa đội ngũ y bác sĩ và phụ huynh thú cưng.
          </p>
        </div>
        <a href="#community" className="see-more">
          Xem thêm 500+ câu chuyện khác <ArrowRightOutlined />
        </a>
      </SectionHeader>

      <StoriesGrid>
        {stories.map(s => (
          <StoryCard key={s.id}>
            <div className="image-wrapper">
              <img src={s.image} alt={s.title} />
              <div className="badge-tag">{s.tag}</div>
            </div>

            <div className="card-body">
              <div className="meta-line">
                <span>{s.treatment}</span>
                <span className="date">{s.date}</span>
              </div>

              <h3 className="title">{s.title}</h3>
              <p className="story-text">{s.text}</p>

              <div className="footer">
                <div className="author">
                  <Avatar
                    style={{
                      backgroundColor: s.avatarColor,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {s.initials}
                  </Avatar>
                  <div>
                    <div className="name">{s.author}</div>
                    <div className="loc">{s.location}</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="like-btn"
                  onClick={() => toggleLike(s.id)}
                >
                  {likes[s.id]?.liked ? <HeartFilled /> : <HeartOutlined />}
                  <span>{likes[s.id]?.count}</span>
                </button>
              </div>
            </div>
          </StoryCard>
        ))}
      </StoriesGrid>
    </SectionWrapper>
  );
};

export default CommunitySection;
