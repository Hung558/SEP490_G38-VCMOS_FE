import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Empty,
  List,
  Pagination,
  Skeleton,
  Typography,
} from 'antd';
import { ReadOutlined } from '@ant-design/icons';
import {
  listMyPetDailyLogs,
  type OwnerInpatientLog,
} from '@/services/InpatientRecordService';
import {
  PET_INPATIENT_LOGS_HASH,
  PET_INPATIENT_LOGS_ID,
} from './inpatientLogsSection';

const PAGE_SIZE = 10;
const { Text } = Typography;

type LogsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: OwnerInpatientLog[] };

const InpatientLogEntry = ({ log }: { log: OwnerInpatientLog }) => {
  // BE provides a calendar date, not a timestamp: don't shift it to browser time.
  const [year, month, day] = log.date.split('-');
  const author =
    typeof log.recordedById === 'object'
      ? log.recordedById?.fullName?.trim()
      : undefined;
  const observations = log.observations?.trim();
  const notes = log.notes?.trim();

  return (
    <div className="inpatient-log-entry">
      <Text strong>
        <time dateTime={log.date}>{`${day}/${month}/${year}`}</time>
      </Text>
      <Text type="secondary">
        Bác sĩ ghi nhận: {author || 'Chưa có thông tin'}
      </Text>
      {observations && (
        <div className="inpatient-log-text">
          <Text strong>Quan sát: </Text>
          {observations}
        </div>
      )}
      {notes && (
        <div className="inpatient-log-text">
          <Text strong>Ghi chú: </Text>
          {notes}
        </div>
      )}
      {!observations && !notes && (
        <Text type="secondary">Không có nội dung bổ sung.</Text>
      )}
    </div>
  );
};

/** Owner-facing history only. A log does not indicate current hospitalization. */
const PetInpatientLogs = ({ petId }: { petId: string }) => {
  const { hash } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [logs, setLogs] = useState<LogsState>({ status: 'loading' });
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE });

  useEffect(() => {
    if (hash !== PET_INPATIENT_LOGS_HASH) return;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'start' });
  }, [hash]);

  useEffect(() => {
    let ignored = false;
    listMyPetDailyLogs(petId, { page, limit: PAGE_SIZE })
      .then(result => {
        if (ignored) return;
        setPagination({ total: result.total, limit: result.limit });
        const lastPage = Math.max(1, result.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setLogs({ status: 'ready', items: result.items });
      })
      .catch(() => {
        if (!ignored) setLogs({ status: 'error' });
      });
    return () => {
      ignored = true;
    };
  }, [petId, page, attempt]);

  return (
    <section className="timeline-card" aria-labelledby={PET_INPATIENT_LOGS_ID}>
      <h2
        id={PET_INPATIENT_LOGS_ID}
        ref={headingRef}
        className="timeline-title inpatient-logs-title"
        tabIndex={-1}
      >
        <ReadOutlined aria-hidden="true" style={{ color: '#0d9488' }} />
        Nhật ký nội trú
      </h2>
      <div className="timeline-subtitle">
        Các ghi nhận theo ngày của bác sĩ qua những đợt điều trị nội trú, mới
        nhất trước. Nhật ký không cho biết bé có đang nằm viện hay không.
      </div>

      <div aria-busy={logs.status === 'loading'}>
        {logs.status === 'loading' ? (
          <>
            <Text type="secondary" role="status">
              Đang tải nhật ký nội trú…
            </Text>
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </>
        ) : logs.status === 'error' ? (
          <Alert
            type="error"
            showIcon
            message="Không tải được nhật ký nội trú"
            action={
              <Button
                size="small"
                onClick={() => {
                  setLogs({ status: 'loading' });
                  setAttempt(previous => previous + 1);
                }}
              >
                Thử lại
              </Button>
            }
          />
        ) : logs.items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có nhật ký nội trú cho thú cưng này."
          />
        ) : (
          <List
            dataSource={logs.items}
            rowKey="_id"
            renderItem={log => (
              <List.Item>
                <InpatientLogEntry log={log} />
              </List.Item>
            )}
          />
        )}
      </div>

      {pagination.total > pagination.limit && (
        <Pagination
          aria-label="Phân trang nhật ký nội trú"
          current={page}
          pageSize={pagination.limit}
          total={pagination.total}
          showSizeChanger={false}
          disabled={logs.status === 'loading'}
          onChange={nextPage => {
            if (page === nextPage) return;
            setLogs({ status: 'loading' });
            setPage(nextPage);
          }}
          style={{ marginTop: 12 }}
        />
      )}
    </section>
  );
};

export default PetInpatientLogs;
