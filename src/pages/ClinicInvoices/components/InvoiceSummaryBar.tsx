import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import { StatGrid, StatTile } from '@/components/dashboard';
import InvoiceService from '@/services/InvoiceService';
import ReportService from '@/services/ReportService';

interface Summary {
  waitingForPickup: number;
  unpaid: number;
  issuedToday: number;
  paidToday: number;
  collectedToday: number;
}

/**
 * Counts on top of "Thu ngân và hóa đơn" (24/11). Today's figures come from the
 * front-desk report (period=day, Vietnam time); the unpaid count covers every
 * date. Reloads with the page's `revision` (after a payment or a new invoice).
 */
const InvoiceSummaryBar: React.FC<{ revision: number }> = ({ revision }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [report, unpaid] = await Promise.all([
        ReportService.getFrontDesk({ period: 'day' }, signal),
        InvoiceService.list({ paymentStatus: 'Unpaid', limit: 1 }, { signal }),
      ]);
      if (signal?.aborted) return;
      setSummary({
        waitingForPickup: report.todayCounters.waitingForPickup,
        unpaid: unpaid.pagination?.total ?? 0,
        issuedToday: report.periodStats.invoices.issuedCount,
        paidToday: report.periodStats.invoices.paidCount,
        collectedToday: report.periodStats.invoices.totalCollected,
      });
      setFailed(false);
    } catch {
      if (!signal?.aborted) setFailed(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  if (failed)
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu thu ngân"
        action={
          <Button size="small" onClick={() => load()}>
            Thử lại
          </Button>
        }
        style={{ marginBottom: 16 }}
      />
    );
  if (!summary)
    return (
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 2 }}
        style={{ marginBottom: 16 }}
      />
    );
  const count = (value: number) => value.toLocaleString('vi-VN');
  return (
    <div style={{ marginBottom: 16 }}>
      <StatGrid $min={180}>
        <StatTile
          icon={<CarOutlined />}
          tone="amber"
          label="Chờ chủ đón"
          value={count(summary.waitingForPickup)}
          caption="Đơn cần lập hóa đơn khi khách đến"
        />
        <StatTile
          icon={<ExclamationCircleOutlined />}
          tone="rose"
          label="Hóa đơn chưa thanh toán"
          value={count(summary.unpaid)}
          caption="Mọi ngày lập"
        />
        <StatTile
          icon={<FileAddOutlined />}
          tone="blue"
          label="Hóa đơn lập hôm nay"
          value={count(summary.issuedToday)}
        />
        <StatTile
          icon={<CheckCircleOutlined />}
          tone="violet"
          label="Đã thanh toán hôm nay"
          value={count(summary.paidToday)}
        />
        <StatTile
          icon={<DollarOutlined />}
          label="Tiền đã thu hôm nay"
          value={`${count(summary.collectedToday)} đ`}
        />
      </StatGrid>
    </div>
  );
};

export default InvoiceSummaryBar;
