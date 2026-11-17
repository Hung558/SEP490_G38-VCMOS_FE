import React from 'react';
import { HistoryOutlined } from '@ant-design/icons';
import PetMedicalHistory from '@/components/medical/PetMedicalHistory';

// This section is SOAP visit history from GET /medical-records/pet/:petId.
// Owner inpatient logs appear in their own section.
const PetTimelineSection: React.FC<{ petId: string }> = ({ petId }) => (
  <div className="timeline-card">
    <div className="timeline-title">
      <HistoryOutlined style={{ color: '#0d9488' }} />
      Lịch sử khám bệnh
    </div>
    <div className="timeline-subtitle">
      Bệnh án các lần khám của bé, mới nhất trước: triệu chứng, chẩn đoán, phác
      đồ và đơn thuốc.
    </div>
    <PetMedicalHistory
      petId={petId}
      emptyText="Bé chưa có lần khám nào được ghi bệnh án."
    />
  </div>
);

export default PetTimelineSection;
