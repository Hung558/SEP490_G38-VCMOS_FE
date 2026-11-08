import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserAddOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Pet, WalkInLookupResult } from '@/types';
import WalkInService, {
  getWalkInCustomerStatus,
  normalizeWalkInPhone,
  validateWalkInPhone,
} from '@/services/WalkInService';
import { extractApiError } from '@/services/AppointmentServiceService';
import { FilterCard } from './styles';

const { Text } = Typography;

const isAbort = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError');

const petColumns: ColumnsType<Pet> = [
  {
    title: 'Mã',
    dataIndex: 'code',
    key: 'code',
    width: 120,
    render: (code?: string) => code || '-',
  },
  {
    title: 'Tên',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => <Text strong>{name}</Text>,
  },
  {
    title: 'Loài',
    dataIndex: 'species',
    key: 'species',
    render: (value?: string | null) => value || '-',
  },
  {
    title: 'Giống',
    dataIndex: 'breed',
    key: 'breed',
    render: (value?: string | null) => value || '-',
  },
  {
    title: 'Cân nặng',
    dataIndex: 'weight',
    key: 'weight',
    width: 110,
    render: (weight?: number | null) =>
      typeof weight === 'number' ? `${weight} kg` : '-',
  },
  {
    title: 'Ngày sinh',
    dataIndex: 'dob',
    key: 'dob',
    width: 120,
    render: (dob?: string | null) =>
      dob ? dayjs(dob).format('DD/MM/YYYY') : '-',
  },
];

interface CustomerLookupPanelProps {
  /** Chỉ Lễ tân tạo được lịch walk-in; Admin chỉ tra cứu */
  canCreateWalkIn: boolean;
  onWalkIn: (phone: string) => void;
}

/** Tra cứu khách hàng và thú cưng theo số điện thoại (UC-20, một phần SCR-21) */
const CustomerLookupPanel = ({
  canCreateWalkIn,
  onWalkIn,
}: CustomerLookupPanelProps) => {
  const [phone, setPhone] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    phone: string;
    data: WalkInLookupResult;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const search = async (raw: string) => {
    const phoneError = validateWalkInPhone(raw);
    if (phoneError) {
      setInputError(phoneError);
      return;
    }
    const normalized = normalizeWalkInPhone(raw);
    setPhone(normalized);
    setInputError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    try {
      const res = await WalkInService.lookupCustomer(normalized, {
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;
      setResult({ phone: normalized, data: res.data });
    } catch (err: unknown) {
      if (isAbort(err) || requestId !== requestIdRef.current) return;
      setResult(null);
      setError(extractApiError(err, 'Không thể tra cứu khách hàng').message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const customer = result?.data.found ? result.data.customer : null;
  const status = customer ? getWalkInCustomerStatus(customer.status) : null;

  return (
    <>
      <FilterCard>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Tra cứu khách hàng theo số điện thoại
        </Text>
        <Input.Search
          value={phone}
          onChange={e => {
            setPhone(e.target.value);
            setInputError(null);
          }}
          onSearch={search}
          enterButton="Tra cứu"
          loading={loading}
          status={inputError ? 'error' : undefined}
          placeholder="Ví dụ: 0988111222"
          inputMode="tel"
          maxLength={14}
          style={{ maxWidth: 420 }}
        />
        {inputError && (
          <Text type="danger" style={{ display: 'block', marginTop: 4 }}>
            {inputError}
          </Text>
        )}
      </FilterCard>

      {error && <Alert type="error" showIcon message={error} />}

      {!result && !error && (
        <Text type="secondary">
          Nhập số điện thoại 10 chữ số để xem hồ sơ khách và các thú cưng đang
          hoạt động của khách.
        </Text>
      )}

      {result && !customer && (
        <Empty description={`Chưa có khách hàng nào dùng số ${result.phone}`}>
          {canCreateWalkIn && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => onWalkIn(result.phone)}
            >
              Tiếp nhận khách mới với số này
            </Button>
          )}
        </Empty>
      )}

      {result && customer && status && (
        <>
          <Descriptions
            title="Thông tin khách hàng"
            bordered
            size="small"
            column={{ xs: 1, md: 2 }}
            extra={
              canCreateWalkIn && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => onWalkIn(result.phone)}
                >
                  Tiếp nhận walk-in
                </Button>
              )
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Họ tên">
              <Text strong>{customer.fullName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã khách hàng">
              {customer.code}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {customer.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {customer.email || <Text type="secondary">Chưa có</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Tài khoản">
              <Tag color={status.color}>{status.label}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Table
            title={() => (
              <Text strong>
                Thú cưng đang hoạt động ({result.data.pets.length})
              </Text>
            )}
            columns={petColumns}
            dataSource={result.data.pets}
            rowKey="_id"
            size="small"
            pagination={false}
            scroll={{ x: 640 }}
            locale={{
              emptyText: 'Khách chưa có thú cưng nào đang hoạt động',
            }}
          />
        </>
      )}
    </>
  );
};

export default CustomerLookupPanel;
