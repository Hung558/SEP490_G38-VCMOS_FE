import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { Alert, Button, Skeleton } from 'antd';
import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import PetTimelineService, {
  type PetTimelineSummary,
} from '@/services/PetTimelineService';
import ROUTER from '@/routerMap/ROUTER';
import TimelineStats from './TimelineStats';

const PetJourneySummary = ({ petId }: { petId: string }) => {
  const [summary, setSummary] = useState<PetTimelineSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setRefreshing(true);
    void PetTimelineService.listPetTimeline(
      petId,
      { page: 1, limit: 1 },
      controller.signal
    )
      .then(result => {
        if (!controller.signal.aborted) setSummary(result.summary);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSummary(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [petId, attempt]);
  return (
    <section className="timeline-card" aria-label="Tổng quan hành trình của bé">
      <h2 className="timeline-title">Hành trình của bé</h2>
      {summary ? (
        <TimelineStats summary={summary} />
      ) : error ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa tải được tổng quan hành trình"
          action={
            <Button onClick={() => setAttempt(value => value + 1)}>
              Thử lại
            </Button>
          }
          style={{ margin: '16px 0' }}
        />
      ) : (
        <Skeleton active paragraph={{ rows: 2 }} />
      )}
      {summary && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '12px 0',
          }}
        >
          <span style={{ color: '#475569' }}>Số liệu tại lần tải gần nhất</span>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => setAttempt(value => value + 1)}
          >
            Làm mới số liệu
          </Button>
        </div>
      )}
      <Link to={generatePath(ROUTER.PET_JOURNEY, { petId })}>
        <Button type="primary" icon={<ArrowRightOutlined />}>
          Xem hành trình của bé
        </Button>
      </Link>
    </section>
  );
};
export default PetJourneySummary;
