import { Button, DatePicker, Input, Select, Space } from 'antd';
import {
  ReloadOutlined,
  UndoOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from '@/services/AppointmentOrderService';
import type { AppointmentStatus } from '@/types';
import { FilterCard } from './styles';

const { RangePicker } = DatePicker;

interface AppointmentFiltersProps {
  status?: AppointmentStatus;
  isOnline?: boolean;
  code?: string;
  singleDate: boolean;
  from?: string;
  to?: string;
  loading: boolean;
  hasFilters: boolean;
  onStatusChange: (status?: AppointmentStatus) => void;
  onIsOnlineChange: (isOnline?: boolean) => void;
  onCodeChange: (code?: string) => void;
  onDateRangeChange: (from?: string, to?: string) => void;
  onReset: () => void;
  onRefresh: () => void;
}

const AppointmentFilters = ({
  status,
  isOnline,
  code,
  singleDate,
  from,
  to,
  loading,
  hasFilters,
  onStatusChange,
  onIsOnlineChange,
  onCodeChange,
  onDateRangeChange,
  onReset,
  onRefresh,
}: AppointmentFiltersProps) => {
  const rangeValue: [Dayjs | null, Dayjs | null] | null =
    from && to ? [dayjs(from), dayjs(to)] : null;

  return (
    <FilterCard>
      <Space
        wrap
        size="middle"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <Space wrap size="middle">
          <Input
            placeholder="Mã lịch hẹn (VD: APT-ABC123)"
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={code}
            onChange={e => onCodeChange(e.target.value)}
            style={{ width: 220 }}
          />

          <Select
            aria-label="Trạng thái"
            placeholder="Trạng thái"
            allowClear
            value={status}
            onChange={onStatusChange}
            style={{ width: 170 }}
            options={APPOINTMENT_STATUSES.map(s => ({
              label: APPOINTMENT_STATUS_LABELS[s],
              value: s,
            }))}
          />

          <Select
            aria-label="Hình thức đặt"
            placeholder="Hình thức đặt"
            allowClear
            value={
              isOnline === undefined
                ? undefined
                : isOnline
                  ? 'online'
                  : 'walkin'
            }
            onChange={val => {
              if (val === 'online') onIsOnlineChange(true);
              else if (val === 'walkin') onIsOnlineChange(false);
              else onIsOnlineChange(undefined);
            }}
            style={{ width: 170 }}
            options={[
              { label: 'Đặt trực tuyến (Online)', value: 'online' },
              { label: 'Đăng ký tại chỗ (Walk-in)', value: 'walkin' },
            ]}
          />

          {singleDate ? (
            <DatePicker
              aria-label="Ngày hẹn"
              placeholder="Ngày hẹn"
              format="YYYY-MM-DD"
              allowClear
              value={from ? dayjs(from) : null}
              onChange={date => {
                const day = date?.format('YYYY-MM-DD');
                onDateRangeChange(day, day);
              }}
              style={{ width: 150 }}
            />
          ) : (
            <RangePicker
              format="YYYY-MM-DD"
              value={rangeValue}
              onChange={dates => {
                if (dates && dates[0] && dates[1]) {
                  onDateRangeChange(
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD')
                  );
                } else {
                  onDateRangeChange(undefined, undefined);
                }
              }}
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 250 }}
            />
          )}
        </Space>

        <Space wrap size="middle">
          <Button
            icon={<UndoOutlined />}
            onClick={onReset}
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
      </Space>
    </FilterCard>
  );
};

export default AppointmentFilters;
