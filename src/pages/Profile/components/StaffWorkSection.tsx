import React from 'react';
import { Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { getStaffRoleContent } from './profileContent';
import { SectionCard } from './styles';

/** Receptionist, Veterinarian, Groomer: what the role does and its schedule */
const StaffWorkSection: React.FC<{ role?: string }> = ({ role }) => {
  const content = getStaffRoleContent(role);
  if (!content) return null;

  return (
    <SectionCard>
      <div className="section-header">
        <div>
          <h4>Công việc của bạn</h4>
          <div className="section-desc">{content.description}</div>
        </div>
      </div>

      <div className="screen-list">
        {content.screens.map(screen => (
          <div className="screen-item" key={screen.code}>
            <span className="screen-name">{screen.name}</span>
            <Tag style={{ margin: 0 }}>Đang phát triển</Tag>
          </div>
        ))}
      </div>

      {/* No shift API yet (SCR-30), so there is nothing to show but the state */}
      <div className="schedule-box">
        <CalendarOutlined className="schedule-icon" />
        <div>
          <strong>Lịch làm việc</strong>
          <span className="schedule-desc">
            Chưa có dữ liệu ca làm việc. Lịch của bạn sẽ hiện ở đây khi chức
            năng phân ca hoàn thành.
          </span>
        </div>
      </div>
    </SectionCard>
  );
};

export default StaffWorkSection;
