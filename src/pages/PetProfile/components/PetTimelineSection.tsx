import React from 'react';
import { Empty } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

// The unified timeline (visits, vaccinations, spa, inpatient stays, invoices)
// is task T-41 and still waits for a BE timeline API, so for now this section
// only tells the owner there is no history yet.
const PetTimelineSection: React.FC = () => (
  <div className="timeline-card">
    <div className="timeline-title">
      <HistoryOutlined style={{ color: '#0d9488' }} />
      Dòng thời gian chăm sóc
    </div>
    <div className="timeline-subtitle">
      Lịch sử khám bệnh, tiêm phòng, spa, nội trú và hóa đơn của thú cưng.
    </div>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="Chưa có lịch sử khám hay chăm sóc nào."
    />
  </div>
);

export default PetTimelineSection;
