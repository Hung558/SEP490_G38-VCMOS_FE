import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Spin } from 'antd';
import { MedicineBoxOutlined, ScissorOutlined } from '@ant-design/icons';
import { useIsLogin } from '@/contexts/routerProvider/isLoginContext';
import StaffService from '@/services/StaffService';
import type { ClinicalStaffRole, StaffMember } from '@/types';

const SectionWrapper = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px 80px 24px;
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
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Notice = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 16px;
  color: #64748b;
  font-size: 14.5px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;

  .ant-btn {
    margin-top: 12px;
  }
`;

const ShowMoreRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 28px;
`;

const DoctorCard = styled.div<{ $accent: string; $tint: string }>`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: ${p => p.$accent};
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  /* No staff photos in the database: initials on a tinted band */
  .avatar-band {
    height: 132px;
    background: ${p => p.$tint};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .initials {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: ${p => p.$accent};
      color: #ffffff;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
    }

    .role-badge {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: ${p => p.$accent};
      display: flex;
      align-items: center;
      gap: 5px;
    }
  }

  .card-body {
    padding: 22px 24px 24px;
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
      color: ${p => p.$accent};
      margin-bottom: 14px;
    }

    .bio {
      font-size: 13.5px;
      color: #64748b;
      line-height: 1.55;
      margin: 0;
    }
  }
`;

// Text per role, written for the home page (the database has no staff bio).
// Vets here examine every common illness, so no specialty is claimed.
const ROLE_PROFILE: Record<
  ClinicalStaffRole,
  {
    badge: string;
    title: string;
    bio: string;
    icon: React.ReactNode;
    accent: string;
    tint: string;
  }
> = {
  Veterinarian: {
    badge: 'Bác sĩ thú y',
    title: 'Bác sĩ thú y · Khám tổng quát',
    bio: 'Khám và điều trị các bệnh thường gặp ở chó mèo, chỉ định xét nghiệm hoặc chẩn đoán hình ảnh khi cần, kê đơn và theo dõi các bé lưu chuồng. Kết quả mỗi lần khám được ghi vào hồ sơ bệnh án của bé.',
    icon: <MedicineBoxOutlined />,
    accent: '#0d9488',
    tint: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
  },
  Groomer: {
    badge: 'Spa & Grooming',
    title: 'Nhân viên Spa & Grooming',
    bio: 'Tắm sấy, vệ sinh tai, cắt dũa móng và cắt tỉa lông theo yêu cầu của chủ nuôi. Ghi chú tình trạng da lông và ảnh trước, sau mỗi lần làm được lưu lại để chủ nuôi theo dõi.',
    icon: <ScissorOutlined />,
    accent: '#c2410c',
    tint: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
  },
};

// Vets first, then groomers; the BE already sorts each by name
const ROLE_ORDER: ClinicalStaffRole[] = ['Veterinarian', 'Groomer'];

// Cards shown before "Xem tất cả"
const INITIAL_VISIBLE = 6;

const getInitials = (fullName: string): string => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words.length > 1 ? words[words.length - 2][0] : '';
  const last = words[words.length - 1][0];
  return `${first}${last}`.toLocaleUpperCase('vi');
};

const DoctorsSection: React.FC = () => {
  const { isLogin } = useIsLogin();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // GET /users/staff needs a signed-in user, so guests are not sent there
  const fetchStaff = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await StaffService.listStaff(
        { status: 'Active', limit: 100 },
        { signal }
      );
      if (signal?.aborted) return;
      setStaff(res?.items || []);
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLogin) {
      setStaff([]);
      return;
    }
    const ctrl = new AbortController();
    fetchStaff(ctrl.signal);
    return () => ctrl.abort();
  }, [isLogin, fetchStaff]);

  const orderedStaff = useMemo(
    () =>
      ROLE_ORDER.flatMap(role => staff.filter(member => member.role === role)),
    [staff]
  );
  const visibleStaff = showAll
    ? orderedStaff
    : orderedStaff.slice(0, INITIAL_VISIBLE);

  const renderGridBody = () => {
    if (!isLogin) {
      return (
        <Notice>
          Đăng nhập để xem danh sách bác sĩ và nhân viên spa của phòng khám.
          <div>
            <Button
              type="primary"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('open-vcmos-login'))
              }
            >
              Đăng nhập
            </Button>
          </div>
        </Notice>
      );
    }
    if (loading) {
      return (
        <Notice>
          <Spin />
        </Notice>
      );
    }
    if (loadError) {
      return (
        <Notice>
          Không thể tải danh sách đội ngũ.{' '}
          <Button type="link" onClick={() => fetchStaff()}>
            Thử lại
          </Button>
        </Notice>
      );
    }
    if (orderedStaff.length === 0) {
      return <Notice>Phòng khám chưa có bác sĩ hoặc nhân viên spa nào.</Notice>;
    }
    return visibleStaff.map(member => {
      const profile = ROLE_PROFILE[member.role];
      return (
        <DoctorCard
          key={member._id}
          $accent={profile.accent}
          $tint={profile.tint}
        >
          <div className="avatar-band">
            <div className="initials" aria-hidden>
              {getInitials(member.fullName)}
            </div>
            <div className="role-badge">
              {profile.icon}
              <span>{profile.badge}</span>
            </div>
          </div>

          <div className="card-body">
            <h3>{member.fullName}</h3>
            <div className="specialty">{profile.title}</div>
            <p className="bio">{profile.bio}</p>
          </div>
        </DoctorCard>
      );
    });
  };

  return (
    <SectionWrapper id="doctors">
      <SectionHeader>
        <span className="section-tag">Đội Ngũ Chuyên Môn VCMOS</span>
        <h2>Bác Sĩ Thú Y & Nhân Viên Spa</h2>
        <p>
          Đội ngũ bác sĩ thú y và nhân viên spa đang làm việc tại VCMOS, luôn
          nhẹ nhàng và tận tâm với từng bé cưng.
        </p>
      </SectionHeader>

      <DoctorsGrid>{renderGridBody()}</DoctorsGrid>

      {isLogin &&
        !loading &&
        !loadError &&
        orderedStaff.length > INITIAL_VISIBLE && (
          <ShowMoreRow>
            <Button onClick={() => setShowAll(prev => !prev)}>
              {showAll ? 'Thu gọn' : `Xem tất cả (${orderedStaff.length})`}
            </Button>
          </ShowMoreRow>
        )}
    </SectionWrapper>
  );
};

export default DoctorsSection;
