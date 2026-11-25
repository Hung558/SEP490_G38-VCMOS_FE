import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Image, Tag } from 'antd';
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  AI_DISCLAIMER,
  aiUrgencyMeta,
  describeClinicalContext,
  safeAiImageUrls,
  symptomLabel,
  type AiAssessmentView,
} from '@/services/AiAssessmentService';
import { formatVnd } from '@/services/InvoiceService';
import {
  serviceCategoryLabels,
  type ServiceCategory,
} from '@/services/ServiceService';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;

  .urgency-box {
    border-radius: 8px;
    padding: 14px;

    &.urgent {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    &.monitor {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    &.routine {
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      color: #0f766e;
    }

    .level-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .timeframe {
      font-size: 12.5px;
      font-weight: 600;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .summary {
      font-size: 13px;
      line-height: 1.55;
      margin: 8px 0 0;
      color: #1e293b;
    }
  }

  /* MSG33 per BR-20: always under the level, quiet but readable */
  .disclaimer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #115e59;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 8px;

    .anticon {
      margin-top: 3px;
      flex-shrink: 0;
    }
  }

  .result-block {
    h4 {
      font-size: 12.5px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    li {
      font-size: 12.5px;
      color: #475569;
      display: flex;
      align-items: flex-start;
      gap: 7px;
      line-height: 1.5;
      overflow-wrap: anywhere;

      .bullet {
        color: #0d9488;
        font-weight: 700;
      }
    }

    &.danger,
    &.warning {
      border-radius: 8px;
      padding: 10px 12px;
    }
    &.danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      h4,
      .bullet {
        color: #b91c1c;
      }
    }
    &.warning {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      h4,
      .bullet {
        color: #c2410c;
      }
    }
  }

  .service-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .service-card {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .service-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .service-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .service-price {
      font-size: 12.5px;
      font-weight: 600;
      color: #0f766e;
      white-space: nowrap;
    }
    .service-reason {
      font-size: 12px;
      color: #475569;
      overflow-wrap: anywhere;
    }

    /* Bookable suggestion: the whole card ticks the service */
    &.selectable {
      flex-direction: row;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;

      &:hover {
        border-color: #0d9488;
      }
      .ant-checkbox-wrapper {
        margin-top: 1px;
      }
      .service-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }
    &.picked {
      border-color: #0d9488;
      background: #f0fdfa;
    }
  }

  .services-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;

    h4 {
      margin: 0;
    }
    .ant-btn {
      padding: 0;
      height: auto;
      font-size: 12.5px;
    }
  }

  .book-hint {
    font-size: 12px;
    color: #64748b;
    margin-top: -6px;
    text-align: center;

    &.needs-pick {
      color: #b45309;
    }
  }

  .sent-input {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;

    .description {
      font-size: 12.5px;
      color: #334155;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 6px 0 0;
    }
    .photos {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;

      .ant-image-img {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: 6px;
      }
    }
  }

  .context {
    font-size: 11.5px;
    color: #64748b;
    display: flex;
    gap: 6px;
    align-items: flex-start;

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
  }
`;

const LEVEL_ICONS = {
  urgent: <ExclamationCircleOutlined />,
  monitor: <AlertOutlined />,
  routine: <CheckCircleOutlined />,
};

const ListBlock: React.FC<{
  title: React.ReactNode;
  items: string[];
  tone?: 'danger' | 'warning';
}> = ({ title, items, tone }) => (
  <section className={`result-block${tone ? ` ${tone}` : ''}`}>
    <h4>{title}</h4>
    <ul>
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>
          <span className="bullet">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
);

interface AiAssessmentResultProps {
  assessment: AiAssessmentView;
  /** Also show what the owner sent (history, timeline) */
  showInput?: boolean;
  /**
   * Booking from the result with the suggested services the owner ticked;
   * no booking controls without it (timeline)
   */
  onBook?: (serviceIds: string[]) => void;
}

/** One AI result as SCR-10 shows it (BE doc table "Ý nghĩa từng trường") */
const AiAssessmentResult: React.FC<AiAssessmentResultProps> = ({
  assessment,
  showInput = false,
  onBook,
}) => {
  const meta = aiUrgencyMeta(assessment.urgency);
  const context = describeClinicalContext(assessment.clinicalContextSummary);
  const photos = safeAiImageUrls(assessment.imageUrls);
  const services = assessment.recommendedServices || [];
  // 25/11: the owner ticks the suggested services to book; none at first
  const bookableIds = [
    ...new Set(
      services
        .map(service => service.serviceId)
        .filter((id): id is string => !!id)
    ),
  ];
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [assessment._id]);
  const togglePick = (serviceId: string) =>
    setPicked(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  const allPicked =
    bookableIds.length > 0 && bookableIds.every(id => picked.includes(id));
  // Booked in the order the AI suggested them
  const pickedInOrder = bookableIds.filter(id => picked.includes(id));

  return (
    <Wrapper data-testid="ai-result" data-urgency={assessment.urgency}>
      <div className={`urgency-box ${meta.tone}`}>
        <div className="level-title">
          {LEVEL_ICONS[meta.tone]} Mức độ: {meta.label}
        </div>
        {assessment.recommendedTimeframe && (
          <div className="timeframe">
            <ClockCircleOutlined /> {assessment.recommendedTimeframe}
          </div>
        )}
        {assessment.summary && <p className="summary">{assessment.summary}</p>}
      </div>

      <div className="disclaimer" role="note">
        <InfoCircleOutlined />
        <span>{assessment.disclaimer || AI_DISCLAIMER}</span>
      </div>

      {assessment.redFlags?.length > 0 && (
        <ListBlock
          tone="danger"
          title={
            <>
              <ExclamationCircleOutlined /> Dấu hiệu nguy hiểm: gặp là đưa bé đi
              cấp cứu ngay
            </>
          }
          items={assessment.redFlags}
        />
      )}
      {assessment.visualFindings?.length > 0 && (
        <ListBlock
          title="Quan sát từ ảnh chụp"
          items={assessment.visualFindings}
        />
      )}
      {assessment.possibleCauses?.length > 0 && (
        <ListBlock
          title="Nguyên nhân có thể (tham khảo)"
          items={assessment.possibleCauses}
        />
      )}
      {assessment.advice?.length > 0 && (
        <ListBlock title="Chăm sóc an toàn tại nhà" items={assessment.advice} />
      )}
      {assessment.contraindications?.length > 0 && (
        <ListBlock
          tone="warning"
          title={
            <>
              <StopOutlined /> Tuyệt đối không làm tại nhà
            </>
          }
          items={assessment.contraindications}
        />
      )}

      {services.length > 0 && (
        <section className="result-block">
          <div className="services-head">
            <h4>Dịch vụ phòng khám gợi ý</h4>
            {onBook && bookableIds.length > 1 && (
              <Button
                type="link"
                onClick={() => setPicked(allPicked ? [] : bookableIds)}
              >
                {allPicked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            )}
          </div>
          <div className="service-list">
            {services.map((service, index) => {
              const key = service.serviceId || `${index}-${service.name}`;
              const info = (
                <>
                  <div className="service-head">
                    <span className="service-name">
                      {service.name}{' '}
                      {service.category && (
                        <Tag style={{ marginLeft: 4 }}>
                          {serviceCategoryLabels[
                            service.category as ServiceCategory
                          ] || service.category}
                        </Tag>
                      )}
                    </span>
                    <span className="service-price">
                      {service.basePrice != null
                        ? formatVnd(service.basePrice)
                        : 'Giá theo danh mục'}
                    </span>
                  </div>
                  {service.reason && (
                    <div className="service-reason">{service.reason}</div>
                  )}
                </>
              );
              const serviceId = service.serviceId;
              if (!onBook || !serviceId) {
                return (
                  <div className="service-card" key={key}>
                    {info}
                  </div>
                );
              }
              const isPicked = picked.includes(serviceId);
              return (
                <label
                  className={`service-card selectable${isPicked ? ' picked' : ''}`}
                  key={key}
                >
                  <Checkbox
                    checked={isPicked}
                    onChange={() => togglePick(serviceId)}
                    aria-label={`Chọn dịch vụ ${service.name}`}
                  />
                  <div className="service-body">{info}</div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {onBook &&
        (bookableIds.length > 0 ? (
          <>
            <Button
              type="primary"
              block
              icon={<CalendarOutlined />}
              disabled={pickedInOrder.length === 0}
              onClick={() => onBook(pickedInOrder)}
            >
              {pickedInOrder.length > 0
                ? `Đặt lịch khám với ${pickedInOrder.length} dịch vụ đã chọn`
                : 'Đặt lịch khám'}
            </Button>
            <div
              className={`book-hint${pickedInOrder.length === 0 ? ' needs-pick' : ''}`}
            >
              {pickedInOrder.length === 0
                ? 'Chọn ít nhất 1 dịch vụ gợi ý ở trên để đặt lịch'
                : 'Ghi chú đặt lịch được điền sẵn từ kết quả này, kèm các dịch vụ đã chọn'}
            </div>
          </>
        ) : (
          <>
            <Button
              type="primary"
              block
              icon={<CalendarOutlined />}
              onClick={() => onBook([])}
            >
              Đặt lịch khám ngay
            </Button>
            <div className="book-hint">
              Ghi chú đặt lịch được điền sẵn từ kết quả này
            </div>
          </>
        ))}

      {showInput && (
        <section className="sent-input result-block">
          <h4>Thông tin bạn đã gửi</h4>
          {assessment.symptoms?.length > 0 && (
            <div>
              {assessment.symptoms.map(symptom => (
                <Tag key={symptom} style={{ marginBottom: 4 }}>
                  {symptomLabel(symptom)}
                </Tag>
              ))}
            </div>
          )}
          <p className="description">{assessment.description}</p>
          {photos.length > 0 && (
            <div className="photos">
              <Image.PreviewGroup>
                {photos.map((url, index) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`Ảnh đã gửi ${index + 1}`}
                    width={72}
                    height={72}
                  />
                ))}
              </Image.PreviewGroup>
            </div>
          )}
        </section>
      )}

      {context.length > 0 && (
        <div className="context">
          <DatabaseOutlined style={{ marginTop: 3 }} />
          <ul>
            {context.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </Wrapper>
  );
};

export default AiAssessmentResult;
