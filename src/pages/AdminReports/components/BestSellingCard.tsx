import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Progress,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, TrophyOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type {
  BestSellingCategory,
  BestSellingItem,
  BestSellingResponse,
  BestSellingSortBy,
} from '@/types';
import InvoiceService, {
  BEST_SELLING_MAX_DAYS,
  formatVnd,
  readInvoiceError,
} from '@/services/InvoiceService';
import {
  PRODUCT_CATEGORIES,
  productCategoryLabels,
} from '@/services/ProductService';
import {
  formatReportRange,
  getPeriodRange,
  getShareOfTop,
  isReportRangeValid,
  matchReportPeriod,
  REPORT_PERIOD_LABELS,
} from './reportRange';
import type { ReportPeriod, ReportRange } from './reportRange';
import { DashSection } from '@/components/dashboard';
import { FilterRow } from './styles';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type KeyedReport = { key: string; data: BestSellingResponse };
type KeyedError = { key: string; message: string };

const LIMIT_OPTIONS = [10, 20, 50];
const RANK_COLORS = ['gold', 'default', 'orange'];
const CATEGORY_COLORS: Record<BestSellingCategory, string> = {
  Medicine: 'blue',
  Vaccine: 'purple',
  Retail: 'green',
};

/**
 * Nghiệp vụ 7.3 "số liệu sản phẩm bán": sản phẩm bán chạy theo ngày, tuần, tháng
 * hoặc khoảng ngày tự chọn (tối đa 366 ngày). BE chỉ tính hóa đơn đã thanh toán,
 * theo ngày thanh toán; gồm hàng bán lẻ và thuốc/vắc xin kê đơn.
 */
const BestSellingCard = () => {
  const [range, setRange] = useState<ReportRange>(() => getPeriodRange('day'));
  // Kept apart from the range: on a Monday "this week" is the same day as today
  const [period, setPeriod] = useState<ReportPeriod | 'custom'>('day');
  const [category, setCategory] = useState<BestSellingCategory>();
  const [sortBy, setSortBy] = useState<BestSellingSortBy>('quantity');
  const [limit, setLimit] = useState(10);
  const [report, setReport] = useState<KeyedReport>();
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<KeyedError>();
  const [revision, setRevision] = useState(0);
  const queryKey = JSON.stringify({
    range,
    category: category ?? null,
    sortBy,
    limit,
    revision,
  });
  const error =
    requestError?.key === queryKey ? requestError.message : undefined;
  const currentReport =
    !error && report?.key === queryKey ? report.data : undefined;
  const currentLoading =
    loading || (isReportRangeValid(range) && !currentReport && !error);

  useEffect(() => {
    if (!isReportRangeValid(range)) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setReport(undefined);
    setRequestError(undefined);
    InvoiceService.getBestSellingProducts(
      { ...range, category, sortBy, limit },
      { signal: controller.signal }
    )
      .then(data => {
        if (!controller.signal.aborted) setReport({ key: queryKey, data });
      })
      .catch(err => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setRequestError({
          key: queryKey,
          message: readInvoiceError(err, 'Không tải được sản phẩm bán chạy')
            .message,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryKey, range, category, sortBy, limit, revision]);

  const reload = useCallback(() => setRevision(value => value + 1), []);

  const items = currentReport?.items || [];
  const topValue =
    sortBy === 'revenue'
      ? items[0]?.totalRevenue || 0
      : items[0]?.totalQuantity || 0;

  const pickerValue: [Dayjs, Dayjs] = [dayjs(range.from), dayjs(range.to)];

  const columns: ColumnsType<BestSellingItem> = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center',
      render: (rank: number) =>
        rank <= 3 ? (
          <Tag color={RANK_COLORS[rank - 1]} icon={<TrophyOutlined />}>
            {rank}
          </Tag>
        ) : (
          <Text>{rank}</Text>
        ),
    },
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Text strong>{item.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.code || 'Sản phẩm không còn trong danh mục'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (value?: BestSellingCategory) =>
        value ? (
          <Tag color={CATEGORY_COLORS[value]}>
            {productCategoryLabels[value] || value}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      render: (value?: string) => value || '-',
    },
    {
      title: 'Số lượng bán',
      dataIndex: 'totalQuantity',
      key: 'quantity',
      width: 170,
      render: (value: number) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Text strong={sortBy === 'quantity'}>
            {value.toLocaleString('vi-VN')}
          </Text>
          {sortBy === 'quantity' && (
            <Progress
              percent={getShareOfTop(value, topValue)}
              showInfo={false}
              size="small"
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'totalRevenue',
      key: 'revenue',
      width: 170,
      align: 'right',
      render: (value: number) => (
        <Space
          direction="vertical"
          size={0}
          style={{ width: '100%', alignItems: 'flex-end' }}
        >
          <Text strong={sortBy === 'revenue'}>{formatVnd(value)}</Text>
          {sortBy === 'revenue' && (
            <Progress
              percent={getShareOfTop(value, topValue)}
              showInfo={false}
              size="small"
              style={{ width: 120 }}
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Số hóa đơn',
      dataIndex: 'invoiceCount',
      key: 'invoices',
      width: 110,
      align: 'right',
    },
  ];

  return (
    <DashSection title="Sản phẩm bán chạy" icon={<TrophyOutlined />}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <FilterRow>
          <Segmented<ReportPeriod | 'custom'>
            value={period}
            onChange={value => {
              if (value === 'custom') return;
              setPeriod(value);
              setRange(getPeriodRange(value));
            }}
            options={[
              ...(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriod[]).map(
                value => ({ value, label: REPORT_PERIOD_LABELS[value] })
              ),
              { value: 'custom', label: 'Tùy chọn', disabled: true },
            ]}
            aria-label="Kỳ báo cáo"
          />
          <RangePicker
            value={pickerValue}
            allowClear={false}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            disabledDate={(current, info) => {
              if (current.isAfter(dayjs(), 'day')) return true;
              const start = info?.from;
              return Boolean(
                start &&
                  Math.abs(current.diff(start, 'day')) >= BEST_SELLING_MAX_DAYS
              );
            }}
            onChange={value => {
              const [start, end] = value || [];
              if (!start || !end) return;
              const picked = {
                from: start.format('YYYY-MM-DD'),
                to: end.format('YYYY-MM-DD'),
              };
              setRange(picked);
              setPeriod(matchReportPeriod(picked) || 'custom');
            }}
            aria-label="Khoảng ngày thanh toán"
          />
          <Select
            allowClear
            placeholder="Mọi danh mục"
            value={category}
            onChange={setCategory}
            options={PRODUCT_CATEGORIES.map(value => ({
              value,
              label: productCategoryLabels[value],
            }))}
            style={{ minWidth: 170 }}
            aria-label="Danh mục"
          />
          <Segmented<BestSellingSortBy>
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'quantity', label: 'Theo số lượng' },
              { value: 'revenue', label: 'Theo doanh thu' },
            ]}
            aria-label="Xếp hạng theo"
          />
          <Select
            value={limit}
            onChange={setLimit}
            options={LIMIT_OPTIONS.map(value => ({
              value,
              label: `Top ${value}`,
            }))}
            style={{ width: 100 }}
            aria-label="Số sản phẩm"
          />
          <Button icon={<ReloadOutlined />} onClick={reload}>
            Làm mới
          </Button>
        </FilterRow>

        <Text type="secondary">
          {formatReportRange(range)} · chỉ tính hóa đơn đã thanh toán, theo ngày
          thanh toán; gồm hàng bán tại quầy và thuốc, vắc xin kê đơn.
        </Text>

        {error && (
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
        )}

        <Table
          rowKey="productId"
          columns={columns}
          dataSource={items}
          loading={currentLoading}
          pagination={false}
          scroll={{ x: 860 }}
          locale={{
            emptyText:
              'Chưa có sản phẩm nào được bán trong khoảng này (chỉ tính hóa đơn đã thanh toán).',
          }}
        />
      </Space>
    </DashSection>
  );
};

export default BestSellingCard;
