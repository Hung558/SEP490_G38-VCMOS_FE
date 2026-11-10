import { Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { MedicalRecord } from '@/types';
import {
  SOAP_FIELDS,
  formatPrescription,
  getMedicalRecordStatus,
  getRecordDoctorName,
  getRecordOrderCode,
  getRecordServiceName,
  getRecordVisitDate,
} from '@/services/MedicalRecordService';

const { Text } = Typography;

const RecordBox = styled.div`
  .record-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .soap-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .soap-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .soap-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 4px;
  }

  .soap-letter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: #0d9488;
    color: #fff;
    font-size: 11px;
  }

  .soap-text {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .record-extra {
    margin-top: 12px;
  }

  ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }
`;

interface MedicalRecordViewProps {
  record: MedicalRecord;
  /** Ngày, dịch vụ, bác sĩ và trạng thái; tắt khi nơi hiển thị đã có các thông tin đó */
  showHeader?: boolean;
  /** Nhãn thêm cạnh trạng thái, ví dụ "Ca đang khám" */
  highlight?: string;
}

/** Bệnh án SOAP chỉ đọc: S-O-A-P, ghi chú và đơn thuốc */
const MedicalRecordView = ({
  record,
  showHeader = true,
  highlight,
}: MedicalRecordViewProps) => {
  const status = getMedicalRecordStatus(record.status);
  const visitDate = getRecordVisitDate(record);
  const orderCode = getRecordOrderCode(record);

  return (
    <RecordBox>
      {showHeader && (
        <div className="record-head">
          <Space direction="vertical" size={0}>
            <Text strong>
              {visitDate ? dayjs(visitDate).format('DD/MM/YYYY') : '—'} ·{' '}
              {getRecordServiceName(record)}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Bác sĩ: {getRecordDoctorName(record)}
              {orderCode ? ` · Lịch hẹn ${orderCode}` : ''}
            </Text>
          </Space>
          <Space size={4} wrap>
            {highlight && <Tag color="blue">{highlight}</Tag>}
            <Tag color={status.color}>{status.label}</Tag>
          </Space>
        </div>
      )}

      <div className="soap-grid">
        {SOAP_FIELDS.map(field => (
          <div className="soap-item" key={field.key}>
            <div className="soap-label">
              <span className="soap-letter">{field.letter}</span>
              {field.label}
            </div>
            <div className="soap-text">
              {record[field.key] || <Text type="secondary">Chưa ghi</Text>}
            </div>
          </div>
        ))}
      </div>

      {record.notes && (
        <div className="record-extra">
          <Text type="secondary">Ghi chú: </Text>
          <span className="soap-text">{record.notes}</span>
        </div>
      )}

      <div className="record-extra">
        <Text strong>Đơn thuốc</Text>
        {record.prescriptions?.length ? (
          <ul>
            {record.prescriptions.map((p, index) => (
              <li key={p._id || index}>
                {formatPrescription(p)}
                {p.instructions && (
                  <Text type="secondary"> · {p.instructions}</Text>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <Text type="secondary">Không kê thuốc</Text>
          </div>
        )}
      </div>
    </RecordBox>
  );
};

export default MedicalRecordView;
