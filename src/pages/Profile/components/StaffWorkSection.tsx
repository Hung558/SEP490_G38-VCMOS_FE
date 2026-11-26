import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOutlined } from '@ant-design/icons';
import ROUTER from '@/routerMap/ROUTER';
import { getStaffRoleContent } from './profileContent';
import { SectionCard } from './styles';

/** Receptionist, Veterinarian, Groomer: the role's screens and its schedule */
const StaffWorkSection: React.FC<{ role?: string }> = ({ role }) => {
  const content = getStaffRoleContent(role);
  if (!content) return null;

  return (
    <SectionCard>
      <div className="section-header">
        <h4>Công việc của bạn</h4>
      </div>

      <div className="screen-list">
        {content.screens.map(screen => (
          <div className="screen-item" key={screen.code}>
            <span className="screen-name">{screen.name}</span>
            <Link to={screen.path} aria-label={`Mở ${screen.name}`}>
              Mở trang
            </Link>
          </div>
        ))}
      </div>

      <div className="schedule-box">
        <CalendarOutlined className="schedule-icon" />
        <div>
          <strong>Lịch làm việc</strong>
          <span className="schedule-desc">
            <Link to={ROUTER.STAFF_SCHEDULES}>Xem lịch làm việc</Link>
          </span>
        </div>
      </div>
    </SectionCard>
  );
};

export default StaffWorkSection;
