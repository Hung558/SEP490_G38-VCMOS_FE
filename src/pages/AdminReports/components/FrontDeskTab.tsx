import type { FrontDeskReport } from '@/services/ReportService';
import PeriodOverview from '@/pages/FrontDeskDashboard/components/PeriodOverview';

/**
 * The reception desk over the report period. 24/11: no "Ngay lúc này" live
 * counters here, the Admin reads the period; the range sits in the filter card.
 */
export default function FrontDeskTab({
  frontDesk,
}: {
  frontDesk: FrontDeskReport;
}) {
  return <PeriodOverview report={frontDesk} />;
}
