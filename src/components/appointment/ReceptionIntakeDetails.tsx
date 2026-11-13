import { Descriptions, Typography } from 'antd';
import styled from 'styled-components';
import type { ReceptionIntake } from '@/types';

const IntakeText = styled.span`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const ReceptionIntakeDetails = ({ intake }: { intake?: ReceptionIntake }) => (
  <Descriptions title="Phiếu tiếp nhận" bordered column={1} size="small">
    {intake ? (
      <>
        <Descriptions.Item label="Triệu chứng">
          <IntakeText>{intake.symptoms}</IntakeText>
        </Descriptions.Item>
        <Descriptions.Item label="Tình trạng ban đầu">
          <IntakeText>{intake.initialCondition}</IntakeText>
        </Descriptions.Item>
      </>
    ) : (
      <Descriptions.Item label="Trạng thái">
        <Typography.Text type="secondary">
          Chưa có phiếu tiếp nhận đã lưu.
        </Typography.Text>
      </Descriptions.Item>
    )}
  </Descriptions>
);

export default ReceptionIntakeDetails;
