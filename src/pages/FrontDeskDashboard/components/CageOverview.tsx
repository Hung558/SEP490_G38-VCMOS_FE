import { Skeleton } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import type { FrontDeskReport } from '@/services/ReportService';
import { Caption, DashSection } from '@/components/dashboard';
import { formatReportNumber } from './helpers';
import { CageFigures, Meter } from './styles';

interface Props {
  report?: FrontDeskReport;
  loading?: boolean;
}

// Current cages, whatever the period filter says. Today's appointment counters
// are not repeated here: the reception screen already lists today's queue.
export default function CageOverview({ report, loading }: Props) {
  const cages = report?.todayCounters.cages;
  return (
    <DashSection
      title="Chuồng hiện tại · toàn phòng khám"
      icon={<BuildOutlined />}
      info="Không phụ thuộc kỳ thống kê. Chuồng trống chưa đồng nghĩa phù hợp với một thú cưng cụ thể: kiểm tra khu vực, cân nặng và yêu cầu cách ly trước khi bố trí."
    >
      {!cages ? (
        <Skeleton active={loading} paragraph={{ rows: 2 }} title={false} />
      ) : (
        <>
          <CageFigures>
            <div>
              <div className="figure-label">Chuồng trống</div>
              <div className="figure-value is-key">
                {formatReportNumber(cages.available)}
              </div>
            </div>
            <div>
              <div className="figure-label">Đang sử dụng</div>
              <div className="figure-value">
                {formatReportNumber(cages.occupied)}
              </div>
            </div>
            <div>
              <div className="figure-label">Tổng số chuồng</div>
              <div className="figure-value">
                {formatReportNumber(cages.total)}
              </div>
            </div>
          </CageFigures>
          <Meter
            role="img"
            aria-label={`Tỷ lệ chuồng đang sử dụng: ${formatReportNumber(cages.occupancyRate)} phần trăm`}
          >
            <div className="meter-head">
              <span>Tỷ lệ đang sử dụng</span>
              <strong>{formatReportNumber(cages.occupancyRate)}%</strong>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, cages.occupancyRate))}%`,
                }}
              />
            </div>
          </Meter>
          {cages.total === 0 && (
            <Caption style={{ marginTop: 10 }}>
              Chưa có chuồng được thiết lập.
            </Caption>
          )}
        </>
      )}
    </DashSection>
  );
}
