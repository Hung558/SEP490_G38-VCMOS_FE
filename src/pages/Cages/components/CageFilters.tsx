import { Button, Select, Space } from 'antd';
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import {
  CAGE_SIZES,
  CAGE_STATUSES,
  cageIsolationLabels,
  cageSizeLabels,
  cageStatusLabels,
  type CageSize,
  type CageSort,
  type CageStatus,
} from '@/services/CageService';
import { FilterCard } from './styles';

interface CageFiltersProps {
  status?: CageStatus;
  size?: CageSize;
  isIsolated?: boolean;
  sort?: CageSort;
  loading: boolean;
  hasFilters: boolean;
  onStatusChange: (status?: CageStatus) => void;
  onSizeChange: (size?: CageSize) => void;
  onIsolationChange: (isIsolated?: boolean) => void;
  onSortChange: (sort?: CageSort) => void;
  onReset: () => void;
  onRefresh: () => void;
}

const CageFilters = ({
  status,
  size,
  isIsolated,
  sort,
  loading,
  hasFilters,
  onStatusChange,
  onSizeChange,
  onIsolationChange,
  onSortChange,
  onReset,
  onRefresh,
}: CageFiltersProps) => {
  return (
    <FilterCard>
      <Space
        wrap
        size="middle"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <Space wrap size="middle">
          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            onChange={onStatusChange}
            style={{ minWidth: 160 }}
            options={[
              ...CAGE_STATUSES.map(s => ({
                label: cageStatusLabels[s],
                value: s,
              })),
            ]}
          />

          <Select
            placeholder="Kích thước"
            allowClear
            value={size}
            onChange={onSizeChange}
            style={{ minWidth: 150 }}
            options={[
              ...CAGE_SIZES.map(s => ({
                label: cageSizeLabels[s],
                value: s,
              })),
            ]}
          />

          <Select
            placeholder="Khu cách ly"
            allowClear
            value={
              isIsolated === undefined
                ? undefined
                : isIsolated
                  ? 'true'
                  : 'false'
            }
            onChange={val => {
              if (val === 'true') onIsolationChange(true);
              else if (val === 'false') onIsolationChange(false);
              else onIsolationChange(undefined);
            }}
            style={{ minWidth: 160 }}
            options={[
              { label: cageIsolationLabels.true, value: 'true' },
              { label: cageIsolationLabels.false, value: 'false' },
            ]}
          />

          <Select
            placeholder="Sắp xếp"
            allowClear
            value={sort}
            onChange={onSortChange}
            style={{ minWidth: 180 }}
            options={[
              { label: 'Nhãn: A → Z', value: 'label' },
              { label: 'Nhãn: Z → A', value: '-label' },
              { label: 'Kích thước: Tăng dần', value: 'size' },
              { label: 'Kích thước: Giảm dần', value: '-size' },
              { label: 'Trạng thái: A → Z', value: 'status' },
              { label: 'Mới nhất trước', value: '-createdAt' },
              { label: 'Cũ nhất trước', value: 'createdAt' },
            ]}
          />
        </Space>

        <Space wrap size="small">
          <Button
            icon={<UndoOutlined />}
            onClick={onReset}
            disabled={!hasFilters && !sort}
          >
            Đặt lại
          </Button>
          <Button
            icon={<ReloadOutlined />}
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

export default CageFilters;
