import { useRef, useState } from 'react';
import { Alert, Button, Input, Segmented } from 'antd';
import type { ReportFilters } from '@/services/ReportService';
import { buildFrontDeskFilters } from './helpers';
import type { FrontDeskFilterDraft, FrontDeskPeriod } from './helpers';
import { FieldError, FilterBar } from './styles';

interface Props {
  onApply: (filters: ReportFilters) => void;
  loading: boolean;
}

const PERIOD_OPTIONS: { value: FrontDeskPeriod; label: string }[] = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn' },
];

// Presets apply at once; a custom range waits for "Áp dụng kỳ thống kê" and is
// checked first (real dates, from ≤ to, at most 366 days)
export default function FrontDeskFilters({ onApply, loading }: Props) {
  const [draft, setDraft] = useState<FrontDeskFilterDraft>({
    period: 'day',
    from: '',
    to: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (next: FrontDeskFilterDraft) => {
    const result = buildFrontDeskFilters(next);
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
  };

  return (
    <>
      <FilterBar
        ref={formRef}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="field">
          <label id="front-desk-period-label">Chọn kỳ</label>
          <Segmented<FrontDeskPeriod>
            aria-labelledby="front-desk-period-label"
            value={draft.period}
            options={PERIOD_OPTIONS}
            onChange={period => {
              const next = { ...draft, period };
              setDraft(next);
              setErrors({});
              if (period !== 'custom') submit(next);
            }}
          />
          {errors.period && (
            <FieldError role="alert">{errors.period}</FieldError>
          )}
        </div>
        {draft.period === 'custom' && (
          <>
            <div className="field">
              <label htmlFor="front-desk-from">Từ ngày</label>
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
            <div className="field">
              <label htmlFor="front-desk-to">Đến ngày</label>
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
            <Button
              className="apply"
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              Áp dụng kỳ thống kê
            </Button>
          </>
        )}
      </FilterBar>
      {Object.keys(errors).length > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message="Khoảng ngày chưa hợp lệ. Báo cáo chưa được thay đổi."
        />
      )}
    </>
  );
}
