import React, { useState } from 'react';
import styled from 'styled-components';
import {
  CheckCircleFilled,
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { toast } from 'sonner';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 64px 24px 80px 24px;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 36px auto;

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

const TabsBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;

  .tab-btn {
    padding: 9px 22px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease-in-out;

    &:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    &.active {
      background: #0d9488;
      border-color: #0d9488;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
    }
  }
`;

const SignInPromptBanner = styled.div`
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .banner-text {
    font-size: 13.5px;
    color: #0f766e;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-sign-in {
    background: #0d9488;
    color: #ffffff;
    border: none;
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    &:hover {
      background: #0f766e;
    }
  }
`;

const FeedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const PostCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: #0d9488;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .post-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .author-info {
      display: flex;
      align-items: center;
      gap: 10px;

      .author-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #f1f5f9;
        color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 1px solid #e2e8f0;
      }

      .name-block {
        strong {
          display: block;
          font-size: 13.5px;
          color: #0f172a;
        }
        span {
          font-size: 11.5px;
          color: #64748b;
        }
      }
    }

    .verified-stamp {
      font-size: 11px;
      font-weight: 600;
      color: #15803d;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 2px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .pet-badge {
    margin-bottom: 12px;
    font-size: 12px;
    color: #0d9488;
    font-weight: 600;
  }

  h3 {
    font-size: 16px;
    font-weight: 750;
    color: #0f172a;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }

  p.content {
    font-size: 13.5px;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 16px 0;
    flex: 1;
  }

  .post-footer {
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #64748b;

    .actions-left {
      display: flex;
      gap: 16px;

      .act-btn {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        color: #64748b;
        font-size: 12.5px;
        transition: color 0.15s;

        &:hover {
          color: #0d9488;
        }
        &.liked {
          color: #e11d48;
        }
      }
    }

    .date-str {
      font-size: 11.5px;
      color: #94a3b8;
    }
  }
`;

// Extracted from VCMOS SRS Public Community Feed
const timelineSharesData = [
  {
    id: 1,
    author: 'Nguyễn Văn An',
    authorRole: 'Chủ thú cưng',
    petName: 'Milo',
    petSpecies: 'Chó Poodle · 5.2 kg',
    title: 'Hành trình điều trị dứt điểm viêm dạ dày ruột cấp cho bé Milo',
    content:
      'Bé Milo bỏ ăn 2 ngày, nôn dịch bọt trắng được BS. CKI Trần Mai Anh thăm khám và lập bệnh án SOAP. Sau 5 ngày dùng kháng sinh kết hợp ăn cháo dinh dưỡng theo chỉ định, bé đã vui vẻ trở lại và chạy nhảy bình thường!',
    date: 'Hôm qua lúc 16:30',
    likes: 18,
    comments: 4,
    verifiedMilestone: 'Đã hoàn tất phác đồ',
  },
  {
    id: 2,
    author: 'Lê Thị Minh Trang',
    authorRole: 'Chủ thú cưng',
    petName: 'Bé Miu',
    petSpecies: 'Mèo Anh lông ngắn · 4.0 kg',
    title: 'Hoàn thành lịch tiêm phòng 4 bệnh & sổ giun định kỳ an toàn',
    content:
      'Quy trình tiêm chủng tại VCMOS rất nhẹ nhàng, bác sĩ kiểm tra thân nhiệt và tim phổi kỹ càng trước khi tiêm. Lịch nhắc tái chủng tự động cập nhật ngay trên hồ sơ web của bé.',
    date: '3 ngày trước',
    likes: 24,
    comments: 6,
    verifiedMilestone: 'Đã xác thực tiêm chủng',
  },
  {
    id: 3,
    author: 'Trần Quốc Huy',
    authorRole: 'Chủ thú cưng',
    petName: 'Lucky',
    petSpecies: 'Golden Retriever · 28 kg',
    title: 'Phẫu thuật lấy dị vật tiêu hoá & 2 ngày chăm sóc nội trú',
    content:
      'Lucky nuốt phải đồ chơi cao su bị tắc nghẽn tiêu hoá. Đội ngũ bác sĩ VCMOS đã chụp X-quang kỹ thuật số và tiến hành can thiệp an toàn. Sau 2 ngày hồi phục tại khu nội trú, bé đã ăn uống lại bình thường!',
    date: '5 ngày trước',
    likes: 42,
    comments: 11,
    verifiedMilestone: 'Ca phẫu thuật thành công',
  },
];

const discussionsData = [
  {
    id: 101,
    author: 'Hoàng Mai Phương',
    authorRole: 'Thành viên cộng đồng',
    petName: 'Mèo Bông',
    petSpecies: 'Mèo Ba Tư · 3.5 kg',
    title: 'Hỏi kinh nghiệm chăm sóc da cho mèo dễ dị ứng thời tiết giao mùa',
    content:
      'Bé nhà mình cứ đến mùa mưa là hay ngứa gãi vùng cổ. Có sen nào dùng sữa tắm dịu nhẹ chuyên dụng của phòng khám tư vấn giúp mình với ạ?',
    date: 'Hôm nay lúc 11:20',
    likes: 9,
    comments: 8,
    verifiedMilestone: 'Thảo luận dinh dưỡng',
  },
  {
    id: 102,
    author: 'Đỗ Tiến Đạt',
    authorRole: 'Thành viên cộng đồng',
    petName: 'Corgi Bun',
    petSpecies: 'Corgi Pembroke · 11 kg',
    title: 'Chia sẻ khẩu phần dinh dưỡng ngừa thoái hóa khớp cho chó chân ngắn',
    content:
      'Bác sĩ Nam khuyên kiểm soát cân nặng không vượt quá 12kg và bổ sung Glucosamine định kỳ. Sau 3 tháng áp dụng bé đi lại linh hoạt hơn hẳn.',
    date: '2 ngày trước',
    likes: 31,
    comments: 14,
    verifiedMilestone: 'Kinh nghiệm chăm sóc',
  },
  {
    id: 103,
    author: 'Nguyễn Thị Bích',
    authorRole: 'Thành viên cộng đồng',
    petName: 'Poodle Xù',
    petSpecies: 'Toy Poodle · 3.8 kg',
    title: 'Review dịch vụ Grooming cắt tỉa tạo kiểu gấu bông tại VCMOS',
    content:
      'Chuyên viên Lê Thu Trang làm việc cực kỳ êm ái, bé Xù vốn nhát nước mà được tắm sấy rất ngoan ngoãn. Form cắt tỉa tròn trịa rất ưng ý!',
    date: '4 ngày trước',
    likes: 19,
    comments: 5,
    verifiedMilestone: 'Đánh giá dịch vụ',
  },
];

interface CommunitySectionProps {
  onOpenLogin?: () => void;
}

const CommunitySection: React.FC<CommunitySectionProps> = ({ onOpenLogin }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'discussions'>(
    'timeline'
  );
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const handleLike = (id: number) => {
    if (likedPosts.includes(id)) {
      setLikedPosts(prev => prev.filter(item => item !== id));
    } else {
      setLikedPosts(prev => [...prev, id]);
      toast.success('Đã ghi nhận lượt thích bài viết');
    }
  };

  const handleInteractionNotice = () => {
    toast.info(
      'Vui lòng đăng nhập tài khoản Chủ thú cưng để tương tác hoặc bình luận!'
    );
    if (onOpenLogin) onOpenLogin();
    else window.dispatchEvent(new CustomEvent('open-vcmos-login'));
  };

  const currentPosts =
    activeTab === 'timeline' ? timelineSharesData : discussionsData;

  return (
    <SectionWrapper id="community">
      <SectionHeader>
        <span className="section-tag">Diễn Đàn & Chia Sẻ Hành Trình</span>
        <h2>Cộng Đồng Chăm Sóc & Hồ Sơ Phục Hồi Thú Cưng</h2>
        <p>
          Nơi chủ nuôi chia sẻ các cột mốc điều trị thực tế từ bệnh án điện tử,
          lan tỏa kinh nghiệm chăm sóc y khoa chuẩn mực và đồng hành cùng bé
          cưng.
        </p>
      </SectionHeader>

      <TabsBar>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Chia sẻ hành trình điều trị ({timelineSharesData.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'discussions' ? 'active' : ''}`}
          onClick={() => setActiveTab('discussions')}
        >
          Hỏi đáp & Thảo luận y khoa ({discussionsData.length})
        </button>
      </TabsBar>

      {/* Sign-in prompt banner */}
      <SignInPromptBanner>
        <div className="banner-text">
          <SafetyCertificateOutlined />
          Đăng nhập tài khoản Chủ thú cưng để thích, bình luận và chia sẻ hành
          trình điều trị từ bệnh án của bé cưng.
        </div>
        <button
          type="button"
          className="btn-sign-in"
          onClick={() => {
            if (onOpenLogin) onOpenLogin();
            else window.dispatchEvent(new CustomEvent('open-vcmos-login'));
          }}
        >
          <LoginOutlined /> Đăng nhập ngay
        </button>
      </SignInPromptBanner>

      <FeedGrid>
        {currentPosts.map(post => {
          const isLiked = likedPosts.includes(post.id);
          const totalLikes = post.likes + (isLiked ? 1 : 0);

          return (
            <PostCard key={post.id}>
              <div className="post-top">
                <div className="author-info">
                  <div className="author-avatar">
                    <UserOutlined />
                  </div>
                  <div className="name-block">
                    <strong>{post.author}</strong>
                    <span>{post.authorRole}</span>
                  </div>
                </div>
                <div className="verified-stamp">
                  <CheckCircleFilled /> {post.verifiedMilestone}
                </div>
              </div>

              <div className="pet-badge">
                🐾 {post.petName} · {post.petSpecies}
              </div>

              <h3>{post.title}</h3>
              <p className="content">{post.content}</p>

              <div className="post-footer">
                <div className="actions-left">
                  <button
                    type="button"
                    className={`act-btn ${isLiked ? 'liked' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    {isLiked ? <HeartFilled /> : <HeartOutlined />}
                    <span>{totalLikes}</span>
                  </button>
                  <button
                    type="button"
                    className="act-btn"
                    onClick={handleInteractionNotice}
                  >
                    <MessageOutlined />
                    <span>{post.comments} bình luận</span>
                  </button>
                </div>
                <div className="date-str">{post.date}</div>
              </div>
            </PostCard>
          );
        })}
      </FeedGrid>
    </SectionWrapper>
  );
};

export default CommunitySection;
