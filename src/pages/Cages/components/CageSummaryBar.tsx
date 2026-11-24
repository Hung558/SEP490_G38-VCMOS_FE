import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { StatGrid, StatTile } from '@/components/dashboard';
import CageService from '@/services/CageService';
import { summarizeCageList, type CageListSummary } from './cageBoardHelpers';

/**
 * Counts on top of the cage page (24/11), over every cage whatever the view or
 * filters. `refreshKey` reloads them when the board refreshes or the list changes.
 */
const CageSummaryBar: React.FC<{ refreshKey: unknown }> = ({ refreshKey }) => {
  const [summary, setSummary] = useState<CageListSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      // Same single page as the board: a clinic has well under 100 cages
      const res = await CageService.listCages(
        { limit: 100, sort: 'label' },
        { signal }
      );
      if (signal?.aborted) return;
      setSummary(summarizeCageList(res?.data?.items || []));
      setFailed(false);
    } catch {
      if (!signal?.aborted) setFailed(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  if (failed)
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu chuồng"
        action={
          <Button size="small" onClick={() => load()}>
            Thử lại
          </Button>
        }
      />
    );
  if (!summary)
    return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  const count = (value: number) => value.toLocaleString('vi-VN');
  const ratio = ({ used, total }: { used: number; total: number }) =>
    `${count(used)}/${count(total)}`;
  return (
    <StatGrid $min={170}>
      <StatTile
        icon={<AppstoreOutlined />}
        tone="slate"
        label="Tổng số chuồng"
        value={count(summary.total)}
      />
      <StatTile
        icon={<CheckCircleOutlined />}
        label="Chuồng trống"
        value={count(summary.available)}
      />
      <StatTile
        icon={<StopOutlined />}
        tone="amber"
        label="Đang sử dụng"
        value={count(summary.occupied)}
      />
      <StatTile
        icon={<HomeOutlined />}
        tone="blue"
        label="Khu chờ"
        value={ratio(summary.holding)}
        caption="Đang dùng / tổng"
      />
      <StatTile
        icon={<MedicineBoxOutlined />}
        tone="violet"
        label="Khu nội trú"
        value={ratio(summary.inpatient)}
        caption="Đang dùng / tổng"
      />
      <StatTile
        icon={<SafetyOutlined />}
        tone="rose"
        label="Chuồng cách ly"
        value={ratio(summary.isolated)}
        caption="Đang dùng / tổng, đã tính trong các khu"
      />
    </StatGrid>
  );
};

export default CageSummaryBar;
