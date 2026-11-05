import {
  Alert,
  Button,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  cageIsolationLabels,
  cageSizeLabels,
  cageStatusColors,
  cageStatusLabels,
  type Cage,
} from '@/services/CageService';
import { ActionsWrapper } from './styles';

const { Text } = Typography;

interface CageTableProps {
  cages: Cage[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  page: number;
  pageSize: number;
  total: number;
  isAdmin: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onResetFilters: () => void;
  onDetail: (id: string) => void;
  onEdit: (cage: Cage) => void;
}

const CageTable = ({
  cages,
  loading,
  error,
  hasFilters,
  page,
  pageSize,
  total,
  isAdmin,
  onPageChange,
  onRetry,
  onResetFilters,
  onDetail,
  onEdit,
}: CageTableProps) => {
  const columns: ColumnsType<Cage> = [
    {
      title: 'Nhãn chuồng',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 15 }}>
            {label}
          </Text>
          {record.isIsolated && (
            <Tag color="magenta" style={{ width: 'fit-content' }}>
              Khu cách ly
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      width: 140,
      render: size => (
        <Tag color="blue" style={{ fontWeight: 500 }}>
          {cageSizeLabels[size as keyof typeof cageSizeLabels] || size}
        </Tag>
      ),
    },
    {
      title: 'Khu cách ly',
      dataIndex: 'isIsolated',
      key: 'isIsolated',
      width: 130,
      render: (isIsolated: boolean) =>
        isIsolated ? (
          <Tag color="error">{cageIsolationLabels.true}</Tag>
        ) : (
          <Tag color="default">{cageIsolationLabels.false}</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: status => {
        const color =
          cageStatusColors[status as keyof typeof cageStatusColors] ||
          'default';
        const label =
          cageStatusLabels[status as keyof typeof cageStatusLabels] || status;
        return (
          <Tag color={color} style={{ fontWeight: 500, padding: '2px 8px' }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: date => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <ActionsWrapper>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onDetail(record._id)}
            />
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
        </ActionsWrapper>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không thể tải danh sách chuồng"
        description={error}
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" type="primary" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={cages}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 768 }}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: false,
        showTotal: totalCount => `Tổng cộng ${totalCount} chuồng`,
      }}
      locale={{
        emptyText: hasFilters ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không tìm thấy chuồng phù hợp với bộ lọc"
          >
            <Button onClick={onResetFilters}>Xóa bộ lọc</Button>
          </Empty>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có chuồng nào trong hệ thống"
          />
        ),
      }}
    />
  );
};

export default CageTable;
