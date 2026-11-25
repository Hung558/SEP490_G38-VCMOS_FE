import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Alert, Button, Empty, Pagination, Skeleton, Tag } from 'antd';
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

/* Under the form of the AI page, in its own frame */
const HistoryWrapper = styled.section`
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px 24px 12px;

  .history-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .history-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;

    .anticon {
      color: #0d9488;
    }
    .total {
      font-weight: 500;
      color: #64748b;
    }
  }
  /* 26/11: the urgency filter is a row of chips like the symptom chips; the
     dot of each level is the colour of its bar in the list below */
  .urgency-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    line-height: 20px;
    color: #334155;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s,
      color 0.15s;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--tone);
    }

    &:hover {
      border-color: var(--tone);
    }
    &:focus-visible {
      outline: 2px solid #0d9488;
      outline-offset: 2px;
    }

    &.all {
      --tone: #0d9488;
      --tone-bg: #f0fdfa;
      --tone-text: #0f766e;
    }
    &.urgent {
      --tone: #dc2626;
      --tone-bg: #fef2f2;
      --tone-text: #b91c1c;
    }
    &.monitor {
      --tone: #f59e0b;
      --tone-bg: #fffbeb;
      --tone-text: #b45309;
    }
    &.routine {
      --tone: #0d9488;
      --tone-bg: #f0fdfa;
      --tone-text: #0f766e;
    }

    &[aria-pressed='true'] {
      font-weight: 600;
      color: var(--tone-text);
      background: var(--tone-bg);
      border-color: var(--tone);
      box-shadow: inset 0 0 0 1px var(--tone);
    }
  }

  .history-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* The bar on the left carries the urgency, so the list reads at a glance */
  .history-item {
    position: relative;
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0 14px 16px;
    border-top: 1px solid #f1f5f9;

    &:first-child {
      border-top: none;
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 16px;
      bottom: 16px;
      width: 3px;
      border-radius: 3px;
      background: #0d9488;
    }
    &.urgent::before {
      background: #dc2626;
    }
    &.monitor::before {
      background: #f59e0b;
    }
  }
  .item-main {
    min-width: 0;
    flex: 1;
  }
  .item-meta {
    display: flex;
    align-items: center;
    gap: 6px 10px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }
  .item-summary {
    font-size: 13.5px;
    line-height: 1.55;
    color: #1e293b;
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

  .history-empty {
    padding: 8px 0 12px;
  }

  @media (max-width: 576px) {
    padding: 16px 16px 8px;

    .history-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
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
        <h2 className="history-title">
          <HistoryOutlined />
          <span>
            {petName
              ? `Lịch sử đánh giá của bé ${petName}`
              : 'Lịch sử đánh giá'}
            {result && (
              <span className="total"> ({result.pagination.total})</span>
            )}
          </span>
        </h2>
        <div
          className="urgency-filter"
          role="group"
          aria-label="Lọc theo mức độ"
        >
          {AI_URGENCY_FILTERS.map(filter => {
            const tone =
              filter.value === 'All' ? 'all' : aiUrgencyMeta(filter.value).tone;
            return (
              <button
                key={filter.value}
                type="button"
                className={`filter-chip ${tone}`}
                aria-pressed={urgency === filter.value}
                onClick={() => {
                  setUrgency(filter.value);
                  setPage(1);
                }}
              >
                {filter.value !== 'All' && (
                  <span className="dot" aria-hidden="true" />
                )}
                {filter.label}
              </button>
            );
          })}
        </div>
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
          className="history-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            urgency === 'All'
              ? `Chưa có lần đánh giá nào${petName ? ` cho bé ${petName}` : ''}`
              : 'Không có lần đánh giá nào ở mức này'
          }
        />
      ) : (
        <>
          <ul className="history-list">
            {items.map(item => {
              const meta = aiUrgencyMeta(item.urgency);
              return (
                <li
                  className={`history-item ${meta.tone}`}
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
                        Triệu chứng:{' '}
                        {item.symptoms.map(symptomLabel).join(', ')}
                      </div>
                    )}
                  </div>
                  <Button size="small" onClick={() => onOpen(item._id)}>
                    Xem chi tiết
                  </Button>
                </li>
              );
            })}
          </ul>
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
