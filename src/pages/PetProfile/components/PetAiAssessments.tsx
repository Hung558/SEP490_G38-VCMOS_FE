import { useState } from 'react';
import { Button, Card, List, Space, Tag, Typography } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { aiUrgencyMeta, symptomLabel } from '@/services/AiAssessmentService';
import type { PetTimelineAiAssessment } from '@/services/PetTimelineService';
import AiAssessmentDetailModal from '@/components/aiAssessment/AiAssessmentDetailModal';

const { Text, Paragraph } = Typography;

const PAGE_SIZE = 5;

interface PetAiAssessmentsProps {
  items: PetTimelineAiAssessment[];
}

/**
 * AI checks on the pet's timeline (BE PR #59): the owner only, never mixed
 * with the clinic's records (BR-20). Read only: booking stays in the AI tab.
 */
const PetAiAssessments = ({ items }: PetAiAssessmentsProps) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section aria-label="Đánh giá sức khỏe bằng AI" style={{ marginTop: 20 }}>
      <Text strong>Đánh giá sức khỏe bằng AI</Text>{' '}
      <Text type="secondary">
        (chỉ bạn xem được, không phải chẩn đoán của bác sĩ)
      </Text>
      <List
        dataSource={items}
        rowKey="_id"
        pagination={
          items.length > PAGE_SIZE
            ? { pageSize: PAGE_SIZE, size: 'small', align: 'end' }
            : false
        }
        renderItem={item => {
          const meta = aiUrgencyMeta(item.urgency);
          return (
            <List.Item>
              <Card
                className="timeline-ai-assessment"
                size="small"
                style={{ width: '100%' }}
              >
                <Space wrap>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Text type="secondary">
                    {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                  {item.imageUrls?.length > 0 && (
                    <Text type="secondary">
                      <CameraOutlined /> {item.imageUrls.length} ảnh
                    </Text>
                  )}
                </Space>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ margin: '8px 0 4px' }}
                >
                  {item.summary}
                </Paragraph>
                {item.symptoms?.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Triệu chứng: {item.symptoms.map(symptomLabel).join(', ')}
                  </Text>
                )}
                <div style={{ marginTop: 6 }}>
                  <Button
                    size="small"
                    type="link"
                    style={{ paddingLeft: 0 }}
                    onClick={() => setOpenId(item._id)}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />
      <AiAssessmentDetailModal
        assessmentId={openId}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
};

export default PetAiAssessments;
