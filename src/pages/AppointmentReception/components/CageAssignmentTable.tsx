import { useEffect, useState } from 'react';
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
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Cage, CageAssignment } from '@/types';
import CageService from '@/services/CageService';
import {
  getAssignmentCageLabel,
  getAssignmentCageSize,
  getAssignmentOperatorName,
  getAssignmentOrderCode,
} from '@/services/CageAssignmentService';
import { ActionsWrapper, FilterCard } from './styles';

const { Text } = Typography;

interface CageAssignmentTableProps {
  assignments: CageAssignment[];
  loading: boolean;
  error?: string | null;
  activeFilter?: boolean;
  cageIdFilter?: string;
  orderIdFilter?: string;
  onActiveFilterChange: (active?: boolean) => void;
  onCageIdFilterChange: (cageId?: string) => void;
  onOrderIdFilterChange: (orderId?: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onViewDetail: (assignment: CageAssignment) => void;
}

const CageAssignmentTable = ({
  assignments,
  loading,
  error,
  activeFilter,
  cageIdFilter,
  orderIdFilter,
  onActiveFilterChange,
  onCageIdFilterChange,
  onOrderIdFilterChange,
  onResetFilters,
  onRefresh,
  onOpenCreateModal,
  onViewDetail,
}: CageAssignmentTableProps) => {
  const [cages, setCages] = useState<Cage[]>([]);
  const [loadingCages, setLoadingCages] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCages = async () => {
      setLoadingCages(true);
      try {
        const res = await CageService.listCages({ limit: 100 });
        if (active && res.data?.items) {
          setCages(res.data.items);
        }
      } catch {
        // Fallback silently if cage list cannot be fetched
      } finally {
        if (active) setLoadingCages(false);
      }
    };
    loadCages();
    return () => {
      active = false;
    };
  }, []);

  const hasFilters = Boolean(
    activeFilter !== undefined ||
      (cageIdFilter && cageIdFilter.trim()) ||
      (orderIdFilter && orderIdFilter.trim())
  );

  const columns: ColumnsType<CageAssignment> = [
    {
      title: 'Chuồng',
      key: 'cage',
      width: 140,
      render: (_, record) => {
        const label = getAssignmentCageLabel(record.cageId);
        const size = getAssignmentCageSize(record.cageId);
        const isIsolated =
          typeof record.cageId === 'object' &&
          record.cageId !== null &&
          record.cageId.isIsolated;

        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: '#0958d9' }}>
              {label}
            </Text>
            <Space size={4}>
              <Tag color="cyan">Size {size}</Tag>
              {isIsolated && <Tag color="warning">Cách ly</Tag>}
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Mã lịch hẹn',
      key: 'order',
      width: 130,
      render: (_, record) => (
        <Text strong>{getAssignmentOrderCode(record.orderId)}</Text>
      ),
    },
    {
      title: 'Người phân công',
      key: 'operator',
      width: 180,
      render: (_, record) => (
        <Text>{getAssignmentOperatorName(record.assignedById)}</Text>
      ),
    },
    {
      title: 'Thời gian phân công',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      width: 170,
      render: (date: string) => (
        <Text>{date ? dayjs(date).format('HH:mm DD/MM/YYYY') : '-'}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_, record) =>
        record.releasedAt ? (
          <Space direction="vertical" size={2}>
            <Tag color="default">Đã trả chuồng</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.releasedAt).format('HH:mm DD/MM/YYYY')}
            </Text>
          </Space>
        ) : (
          <Tag color="green">Đang sử dụng</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <ActionsWrapper>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          >
            Chi tiết
          </Button>
        </ActionsWrapper>
      ),
    },
  ];

  return (
    <div>
      <FilterCard>
        <Space
          wrap
          size="middle"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space wrap size="middle">
            <Select
              placeholder="Lọc theo chuồng"
              allowClear
              showSearch
              loading={loadingCages}
              value={cageIdFilter}
              onChange={val => onCageIdFilterChange(val)}
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              style={{ width: 180 }}
              options={cages.map(c => ({
                label: `${c.label} (Size ${c.size})`,
                value: c._id,
              }))}
            />

            <Input
              placeholder="Lọc theo ID đơn hẹn"
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={orderIdFilter}
              onChange={e => onOrderIdFilterChange(e.target.value)}
              style={{ width: 220 }}
            />

            <Select
              placeholder="Trạng thái phân chuồng"
              value={
                activeFilter === undefined
                  ? 'all'
                  : activeFilter
                    ? 'active'
                    : 'released'
              }
              onChange={val => {
                if (val === 'active') onActiveFilterChange(true);
                else if (val === 'released') onActiveFilterChange(false);
                else onActiveFilterChange(undefined);
              }}
              style={{ width: 190 }}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Đang hoạt động (Chưa trả)', value: 'active' },
                { label: 'Đã hoàn tất (Đã trả)', value: 'released' },
              ]}
            />

            <Button
              icon={<UndoOutlined />}
              onClick={onResetFilters}
              disabled={!hasFilters || loading}
            >
              Đặt lại
            </Button>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={onRefresh}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
          >
            Phân chuồng mới
          </Button>
        </Space>
      </FilterCard>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={onRefresh}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={assignments}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 870 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: t => `Tổng cộng ${t} lượt phân chuồng`,
        }}
      />
    </div>
  );
};

export default CageAssignmentTable;
