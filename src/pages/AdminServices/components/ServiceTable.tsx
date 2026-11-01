import { Alert, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import {
  formatServiceDuration,
  formatServicePrice,
  serviceCategoryLabels,
  serviceStatusLabels,
  type Service,
  type ServiceStatus,
} from '@/services/ServiceService';

const { Text } = Typography;

interface Props {
  services: Service[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  page: number;
  pageSize: number;
  statusPendingId: string | null;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onDetail: (service: Service) => void;
  onEdit: (service: Service) => void;
  onChangeStatus: (service: Service, status: ServiceStatus) => void;
}

const ServiceTable = ({
  services,
  loading,
  error,
  hasFilters,
  page,
  pageSize,
  statusPendingId,
  onPageChange,
  onRetry,
  onDetail,
  onEdit,
  onChangeStatus,
}: Props) => {
  const columns = useMemo(
    () => [
      {
        title: 'Mã',
        dataIndex: 'code',
        key: 'code',
        width: 130,
      },
      {
        title: 'Tên dịch vụ',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, service: Service) => (
          <div>
            <div>{value}</div>
            {service.description ? (
              <Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
                {service.description}
              </Text>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Danh mục',
        dataIndex: 'category',
        key: 'category',
        width: 170,
        render: (value: Service['category']) =>
          serviceCategoryLabels[value] || value,
      },
      {
        title: 'Thời lượng',
        dataIndex: 'defaultDuration',
        key: 'defaultDuration',
        width: 130,
        render: (value?: number) => formatServiceDuration(value),
      },
      {
        title: 'Giá niêm yết',
        dataIndex: 'basePrice',
        key: 'basePrice',
        width: 160,
        render: (value?: number) => formatServicePrice(value),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (value: ServiceStatus) => (
          <Tag color={value === 'Active' ? 'green' : 'default'}>
            {serviceStatusLabels[value] || value}
          </Tag>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 260,
        render: (_: unknown, service: Service) => {
          const isActive = service.status === 'Active';
          return (
            <Space wrap>
              <Button icon={<EyeOutlined />} onClick={() => onDetail(service)}>
                Chi tiết
              </Button>
              <Button icon={<EditOutlined />} onClick={() => onEdit(service)}>
                Sửa
              </Button>
              <Popconfirm
                title={
                  isActive
                    ? `Ngừng cung cấp dịch vụ ${service.name}?`
                    : `Kích hoạt lại dịch vụ ${service.name}?`
                }
                description={
                  isActive
                    ? 'Lịch sử lịch hẹn và hóa đơn được giữ nguyên.'
                    : undefined
                }
                okText={isActive ? 'Ngừng cung cấp' : 'Kích hoạt'}
                cancelText="Hủy"
                onConfirm={() =>
                  onChangeStatus(service, isActive ? 'Inactive' : 'Active')
                }
              >
                <Button
                  type="link"
                  danger={isActive}
                  loading={statusPendingId === service._id}
                  icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                >
                  {isActive ? 'Ngừng cung cấp' : 'Kích hoạt'}
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [onChangeStatus, onDetail, onEdit, statusPendingId]
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải danh sách dịch vụ"
          description={error}
          action={
            <Button size="small" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      ) : null}
      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={services}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total: services.length,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: total => `${total} dịch vụ`,
        }}
        locale={{
          emptyText: error
            ? 'Không tải được dữ liệu'
            : hasFilters
              ? 'Không có dịch vụ phù hợp bộ lọc'
              : 'Chưa có dịch vụ nào trong hệ thống',
        }}
      />
    </Space>
  );
};

export default ServiceTable;
