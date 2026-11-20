import { useRef, useState } from 'react';
import { Alert, Button, Card, Input, Select, Typography } from 'antd';
import type { ReportFilters } from '@/services/ReportService';
import { buildFrontDeskFilters, PERIOD_LABELS } from './helpers';
import type { FrontDeskFilterDraft, FrontDeskPeriod } from './helpers';
import { FieldError, FilterLayout, Help } from './styles';

interface Props {
  onApply: (filters: ReportFilters) => void;
  loading: boolean;
}
export default function FrontDeskFilters({ onApply, loading }: Props) {
  const [draft, setDraft] = useState<FrontDeskFilterDraft>({
    period: 'day',
    from: '',
    to: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Card title="Kỳ thống kê">
      <FilterLayout
        ref={formRef}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          const result = buildFrontDeskFilters(draft);
          setErrors(result.errors);
          if (!result.filters) {
            requestAnimationFrame(() =>
              formRef.current
                ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                ?.focus()
            );
            return;
          }
          onApply(result.filters);
        }}
      >
        <div>
          <label htmlFor="front-desk-period">Chọn kỳ</label>
          <Select
            id="front-desk-period"
            value={draft.period}
            aria-invalid={Boolean(errors.period)}
            aria-describedby="front-desk-period-error"
            options={Object.entries(PERIOD_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(period: FrontDeskPeriod) => {
              setDraft(value => ({ ...value, period }));
              setErrors({});
            }}
          />
          {errors.period && (
            <FieldError id="front-desk-period-error" role="alert">
              {errors.period}
            </FieldError>
          )}
        </div>
        {draft.period === 'custom' && (
          <>
            <div>
              <label htmlFor="front-desk-from">Từ ngày (bắt buộc)</label>
              <Input
                id="front-desk-from"
                type="date"
                required
                value={draft.from}
                min="0001-01-01"
                max="9999-12-31"
                status={errors.from ? 'error' : undefined}
                aria-invalid={Boolean(errors.from)}
                aria-describedby="front-desk-from-error"
                onChange={event => {
                  setDraft(value => ({ ...value, from: event.target.value }));
                  setErrors({});
                }}
              />
              {errors.from && (
                <FieldError id="front-desk-from-error" role="alert">
                  {errors.from}
                </FieldError>
              )}
            </div>
            <div>
              <label htmlFor="front-desk-to">Đến ngày (bắt buộc)</label>
              <Input
                id="front-desk-to"
                type="date"
                required
                value={draft.to}
                min="0001-01-01"
                max="9999-12-31"
                status={errors.to ? 'error' : undefined}
                aria-invalid={Boolean(errors.to)}
                aria-describedby="front-desk-to-error"
                onChange={event => {
                  setDraft(value => ({ ...value, to: event.target.value }));
                  setErrors({});
                }}
              />
              {errors.to && (
                <FieldError id="front-desk-to-error" role="alert">
                  {errors.to}
                </FieldError>
              )}
            </div>
          </>
        )}
        <Button type="primary" htmlType="submit" loading={loading}>
          Áp dụng kỳ thống kê
        </Button>
      </FilterLayout>
      {Object.keys(errors).length > 0 && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          message="Khoảng ngày chưa hợp lệ. Báo cáo chưa được thay đổi."
        />
      )}
      <Help>
        Nhấn Áp dụng để đổi kỳ. Ngày tính theo múi giờ Việt Nam (UTC+7), bao gồm
        cả ngày đầu và ngày cuối; tối đa 366 ngày.{' '}
        <Typography.Text strong>
          Các bộ đếm trực tiếp và chuồng không thay đổi theo bộ lọc kỳ.
        </Typography.Text>
      </Help>
    </Card>
  );
}
