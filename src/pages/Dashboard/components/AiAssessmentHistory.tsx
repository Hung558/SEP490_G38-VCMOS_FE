import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Alert,
  Button,
  Empty,
  Pagination,
  Segmented,
  Skeleton,
  Tag,
} from 'antd';
import { CameraOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AiAssessmentService, {
  AI_URGENCY_FILTERS,
  aiUrgencyMeta,
  buildAiHistoryQuery,
  readAiAssessmentError,
  symptomLabel,
  type AiAssessmentPage,
  type AiUrgencyFilter,
} from '@/services/AiAssessmentService';

const HistoryWrapper = styled.section`
  margin-top: 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;

  .history-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .history-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .ant-segmented {
    max-width: 100%;
    overflow-x: auto;
  }

  .history-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid #f1f5f9;

    &:first-of-type {
      border-top: none;
    }
  }
  .item-main {
    min-width: 0;
    flex: 1;
  }
  .item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #64748b;
  }
  .item-summary {
    font-size: 13px;
    color: #334155;
    margin: 6px 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .item-symptoms {
    font-size: 12px;
    color: #64748b;
    overflow-wrap: anywhere;
  }

  @media (max-width: 576px) {
    padding: 14px;

    .history-item {
      flex-direction: column;
    }
  }
`;

interface AiAssessmentHistoryProps {
  petId?: string;
  petName?: string;
  /** Changes after each new check so the list reloads */
  refreshKey: number;
  onOpen: (assessmentId: string) => void;
}

/** History of AI checks of one pet (GET /ai-assessments?petId=) */
const AiAssessmentHistory: React.FC<AiAssessmentHistoryProps> = ({
  petId,
  petName,
  refreshKey,
  onOpen,
}) => {
  const [urgency, setUrgency] = useState<AiUrgencyFilter>('All');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AiAssessmentPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Another pet or a new check starts again from the first page
  useEffect(() => {
    setPage(1);
  }, [petId, refreshKey]);

  useEffect(() => {
    if (!petId) {
      setResult(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    AiAssessmentService.listAssessments(
      buildAiHistoryQuery(petId, urgency, page),
      { signal: controller.signal }
    )
      .then(response => {
        if (!controller.signal.aborted) setResult(response);
      })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setError(
          readAiAssessmentError(failure, 'Không tải được lịch sử đánh giá AI')
            .message
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [petId, urgency, page, refreshKey, attempt]);

  if (!petId) return null;

  const items = result?.items || [];

  return (
    <HistoryWrapper aria-label="Lịch sử đánh giá AI">
      <div className="history-head">
        <h4 className="history-title">
          <HistoryOutlined style={{ color: '#0d9488' }} />
          {petName ? `Lịch sử đánh giá của bé ${petName}` : 'Lịch sử đánh giá'}
          {result ? ` (${result.pagination.total})` : ''}
        </h4>
        <Segmented
          size="small"
          value={urgency}
          options={AI_URGENCY_FILTERS.map(filter => ({
            value: filter.value,
            label: filter.label,
          }))}
          onChange={value => {
            setUrgency(value as AiUrgencyFilter);
            setPage(1);
          }}
        />
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => setAttempt(n => n + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : loading && !result ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            urgency === 'All'
              ? `Chưa có lần đánh giá nào${petName ? ` cho bé ${petName}` : ''}`
              : 'Không có lần đánh giá nào ở mức này'
          }
        />
      ) : (
        <>
          {items.map(item => {
            const meta = aiUrgencyMeta(item.urgency);
            return (
              <div
                className="history-item"
                key={item._id}
                data-testid="ai-history-item"
              >
                <div className="item-main">
                  <div className="item-meta">
                    <Tag color={meta.color} style={{ margin: 0 }}>
                      {meta.label}
                    </Tag>
                    <span>
                      {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                    </span>
                    {item.imageUrls?.length > 0 && (
                      <span>
                        <CameraOutlined /> {item.imageUrls.length} ảnh
                      </span>
                    )}
                  </div>
                  <p className="item-summary">{item.summary}</p>
                  {item.symptoms?.length > 0 && (
                    <div className="item-symptoms">
                      Triệu chứng: {item.symptoms.map(symptomLabel).join(', ')}
                    </div>
                  )}
                </div>
                <Button size="small" onClick={() => onOpen(item._id)}>
                  Xem chi tiết
                </Button>
              </div>
            );
          })}
          {result && result.pagination.total > result.pagination.limit && (
            <Pagination
              size="small"
              current={result.pagination.page}
              pageSize={result.pagination.limit}
              total={result.pagination.total}
              showSizeChanger={false}
              onChange={setPage}
              disabled={loading}
              style={{ marginTop: 12, textAlign: 'right' }}
            />
          )}
        </>
      )}
    </HistoryWrapper>
  );
};

export default AiAssessmentHistory;
