import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { extractApiError } from '@/services/AppointmentServiceService';
import {
  listInpatientRecords,
  type InpatientPage,
  type InpatientRecord,
  type InpatientStatus,
} from '@/services/InpatientRecordService';
import { formatClinicTime } from '@/services/InpatientRecordService/helpers';
import {
  PageHeader,
  PageWrapper,
} from '../AppointmentReception/components/styles';
import InpatientDetail from './InpatientDetail';
import PageTitle from '@/components/common/PageTitle';

const { Text } = Typography;
const limit = 15;

const name = <T extends object>(ref: T | string | null, key: keyof T) =>
  ref && typeof ref === 'object' ? String(ref[key] || '—') : '—';

const InpatientCare = () => {
  const [params, setParams] = useSearchParams();
  const recordId = params.get('record');
  const [status, setStatus] = useState<InpatientStatus>('Admitted');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<InpatientPage<InpatientRecord>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(value => value + 1);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(undefined);
    listInpatientRecords(
      { status, mine: mine || undefined, page, limit },
      abort.signal
    )
      .then(data => {
        if (abort.signal.aborted) return;
        if (data.totalPages < page && page > 1) {
          setPage(Math.max(1, data.totalPages));
        } else {
          setResult(data);
        }
      })
      .catch(failure => {
        if (!abort.signal.aborted) {
          setResult(undefined);
          setError(
            extractApiError(failure, 'Không tải được danh sách nội trú').message
          );
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [status, mine, page, version]);

  const openRecord = (id: string | null) => {
    if (id) setParams({ record: id });
    else setParams({}, { replace: true });
  };

  return (
    <PageWrapper>
      <Card>
        <PageHeader>
          <div>
            <PageTitle>Nội trú</PageTitle>
          </div>
          <Button onClick={reload} loading={loading}>
            Làm mới
          </Button>
        </PageHeader>
        <Space wrap size="middle" style={{ marginBottom: 16 }}>
          <Segmented<InpatientStatus>
            aria-label="Trạng thái nội trú"
            value={status}
            options={[
              { label: 'Đang nội trú', value: 'Admitted' },
              { label: 'Đã xuất viện', value: 'Discharged' },
            ]}
            onChange={value => {
              setPage(1);
              setStatus(value);
              setResult(undefined);
            }}
          />
          <Checkbox
            checked={mine}
            onChange={event => {
              setPage(1);
              setMine(event.target.checked);
              setResult(undefined);
            }}
          >
            Chỉ ca tôi phụ trách
          </Checkbox>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={reload}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <Table<InpatientRecord>
            scroll={{ x: 1000 }}
            rowKey="_id"
            loading={loading}
            dataSource={result?.items || []}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    status === 'Admitted'
                      ? 'Không có thú cưng đang nội trú'
                      : 'Không có hồ sơ đã xuất viện'
                  }
                />
              ),
            }}
            pagination={{
              current: page,
              total: result?.total || 0,
              pageSize: limit,
              showSizeChanger: false,
              onChange: setPage,
            }}
            columns={[
              {
                title: 'Thú cưng',
                render: (_, row) => (
                  <>
                    <Text strong>{name(row.petId, 'name')}</Text>
                    <br />
                    <Text type="secondary">{name(row.petId, 'code')}</Text>
                  </>
                ),
              },
              {
                title: 'Lịch hẹn',
                render: (_, row) => name(row.orderId, 'code'),
              },
              {
                title: 'Chuồng',
                render: (_, row) => name(row.cageId, 'label'),
              },
              {
                title: 'Bác sĩ phụ trách',
                render: (_, row) => name(row.attendingVetId, 'fullName'),
              },
              {
                title: status === 'Admitted' ? 'Nhập viện' : 'Xuất viện',
                render: (_, row) =>
                  formatClinicTime(
                    status === 'Admitted' ? row.admittedAt : row.dischargedAt
                  ),
              },
              {
                title: 'Trạng thái',
                render: (_, row) =>
                  row.status === 'Admitted' ? (
                    <Tag color="processing">Đang nội trú</Tag>
                  ) : (
                    <Tag color="success">Đã xuất viện</Tag>
                  ),
              },
              {
                title: 'Thao tác',
                render: (_, row) => (
                  <Button onClick={() => openRecord(row._id)}>Xem hồ sơ</Button>
                ),
              },
            ]}
          />
        )}
      </Card>
      {recordId && (
        <InpatientDetail
          key={recordId}
          recordId={recordId}
          onClose={() => openRecord(null)}
          onChanged={reload}
        />
      )}
    </PageWrapper>
  );
};

export default InpatientCare;
