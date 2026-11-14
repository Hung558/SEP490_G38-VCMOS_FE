import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Cage } from '@/services/CageService';
import CageAssignmentService, {
  getAssignmentCageLabel,
  getAssignmentCageSize,
  getAssignmentOperatorName,
  getAssignmentOrderCode,
} from '@/services/CageAssignmentService';
import {
  extractApiError,
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
} from '@/services/AppointmentOrderService';
import type { CageAssignment } from '@/types';
import {
  formatTimeInCage,
  getAssignmentOrder,
  sortCagesForBoard,
} from './cageBoardHelpers';
import { FilterCard } from './styles';

const { Text } = Typography;

type StatusFilter = 'all' | 'active' | 'released';

interface CageAssignmentHistoryProps {
  cages: Cage[];
}

/** Who was in which cage and when (read-only log of GET /cage-assignments) */
const CageAssignmentHistory = ({ cages }: CageAssignmentHistoryProps) => {
  const [items, setItems] = useState<CageAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [cageId, setCageId] = useState<string>();
  const [code, setCode] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await CageAssignmentService.listCageAssignments(
          {
            active: status === 'all' ? undefined : status === 'active',
            cageId,
          },
          { signal }
        );
        if (!signal.aborted) setItems(res.data || []);
      } catch (err) {
        if (axios.isCancel(err) || signal.aborted) return;
        setError(
          extractApiError(err, 'Không tải được lịch sử phân chuồng').message
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [status, cageId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadTick]);

  // The order code is populated on each row, so it filters on the loaded list
  const keyword = code.trim().toUpperCase();
  const visible = keyword
    ? items.filter(a =>
        getAssignmentOrderCode(a.orderId).toUpperCase().includes(keyword)
      )
    : items;

  const columns: ColumnsType<CageAssignment> = [
    {
      title: 'Chuồng',
      key: 'cage',
      width: 130,
      render: (_, a) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#0958d9' }}>
            {getAssignmentCageLabel(a.cageId)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cỡ {getAssignmentCageSize(a.cageId)}
            {typeof a.cageId === 'object' && a.cageId?.isIsolated
              ? ' · Cách ly'
              : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Lịch hẹn',
      key: 'order',
      width: 170,
      render: (_, a) => {
        const { order } = getAssignmentOrder(a);
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{getAssignmentOrderCode(a.orderId)}</Text>
            {order?.derivedStatus && (
              <Tag
                color={getAppointmentStatusColor(order.derivedStatus)}
                style={{ marginInlineEnd: 0 }}
              >
                {getAppointmentStatusLabel(order.derivedStatus)}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Người xếp chuồng',
      key: 'operator',
      width: 170,
      render: (_, a) => getAssignmentOperatorName(a.assignedById),
    },
    {
      title: 'Vào chuồng',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      width: 150,
      render: (date?: string) =>
        date ? dayjs(date).format('HH:mm DD/MM/YYYY') : '-',
    },
    {
      title: 'Ra chuồng',
      key: 'releasedAt',
      width: 190,
      render: (_, a) =>
        a.releasedAt ? (
          <Space direction="vertical" size={2}>
            <Text>{dayjs(a.releasedAt).format('HH:mm DD/MM/YYYY')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ở{' '}
              {formatTimeInCage(
                a.assignedAt,
                new Date(a.releasedAt).getTime()
              ) || '-'}
            </Text>
          </Space>
        ) : (
          <Tag color="gold">Đang ở trong chuồng</Tag>
        ),
    },
  ];

  return (
    <div>
      <FilterCard>
        <Space wrap size="middle">
          <Select
            aria-label="Trạng thái"
            value={status}
            onChange={setStatus}
            style={{ width: 190 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Đang ở trong chuồng' },
              { value: 'released', label: 'Đã ra chuồng' },
            ]}
          />
          <Select
            aria-label="Chuồng"
            placeholder="Mọi chuồng"
            allowClear
            showSearch
            optionFilterProp="label"
            value={cageId}
            onChange={setCageId}
            style={{ width: 180 }}
            options={sortCagesForBoard(cages).map(c => ({
              value: c._id,
              label: `${c.label} (cỡ ${c.size})`,
            }))}
          />
          <Input
            aria-label="Mã lịch hẹn"
            placeholder="Mã lịch hẹn, ví dụ APT-K7M2QX"
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{ width: 240 }}
          />
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => setReloadTick(t => t + 1)}
          >
            Làm mới
          </Button>
        </Space>
      </FilterCard>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={visible}
        rowKey="_id"
        loading={loading}
        size="middle"
        scroll={{ x: 820 }}
        pagination={{
          pageSize: 10,
          showTotal: total => `${total} lượt xếp chuồng`,
        }}
        locale={{ emptyText: 'Chưa có lượt xếp chuồng nào' }}
      />
    </div>
  );
};

export default CageAssignmentHistory;
