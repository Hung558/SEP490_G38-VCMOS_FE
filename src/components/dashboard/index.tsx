// Building blocks shared by the report pages (Tổng quan quản trị, Tổng quan lễ tân):
// stat tiles, ranked bar lists, meters, a two-part split bar and a column chart
// with a table twin. One accent hue (the brand teal) carries every single-series
// mark; text always stays in the slate text colours, never in the mark colour.
import React, { useId, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Segmented, Table, Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import PageTitle from '@/components/common/PageTitle';
import {
  donutArcs,
  foldParts,
  shareText,
  showTick,
  trendAsLine,
  trendPaths,
} from './chartMath';

export { orderedBy, upToToday } from './chartMath';

export const VIZ = {
  accent: '#0d9488',
  accentStrong: '#0f766e',
  accentTrack: '#ccfbf1',
  accentWash: '#f0fdfa',
  // Second categorical slot (validated against the accent: CVD ΔE 10.7)
  series2: '#eb6834',
  // Third slot (24/11, donut parts): teal/orange/violet validated all pairs
  // on white, worst CVD ΔE 10.7, normal 24.7, tritan 11.6
  series3: '#6250d6',
  // Status colours, always shown with an icon and the status name
  warning: '#d97706',
  grid: '#eef2f6',
  border: '#e6ebf1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  good: '#15803d',
  critical: '#b91c1c',
};

const TONES = {
  teal: ['#f0fdfa', '#0d9488'],
  blue: ['#eff6ff', '#2563eb'],
  amber: ['#fffbeb', '#d97706'],
  rose: ['#fff1f2', '#e11d48'],
  violet: ['#f5f3ff', '#7c3aed'],
  slate: ['#f1f5f9', '#475569'],
} as const;
export type Tone = keyof typeof TONES;

/* ------------------------------------------------------------------ page */

const HeaderBox = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;

  .extra {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
`;

/** Page title (the shared PageTitle look) with optional actions beside it */
export const PageHeader = ({
  title,
  extra,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
}) => (
  <HeaderBox>
    <PageTitle>{title}</PageTitle>
    {extra && <div className="extra">{extra}</div>}
  </HeaderBox>
);

/** Read by screen readers, not shown */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/* ------------------------------------------------------------- info tip */

const InfoButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  color: #94a3b8;
  cursor: help;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  line-height: 1;

  &:hover,
  &:focus-visible {
    color: ${VIZ.accent};
  }
`;

/** Long caveats live behind an (i), readable on hover and keyboard focus */
export const InfoTip = ({
  text,
  label,
}: {
  text: React.ReactNode;
  label?: string;
}) => (
  <Tooltip title={text} placement="top" styles={{ root: { maxWidth: 360 } }}>
    <InfoButton
      type="button"
      aria-label={label || (typeof text === 'string' ? text : 'Giải thích')}
    >
      <InfoCircleOutlined />
    </InfoButton>
  </Tooltip>
);

/* -------------------------------------------------------------- section */

const SectionBox = styled.section`
  background: #ffffff;
  border: 1px solid ${VIZ.border};
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;

  > .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .title-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: ${VIZ.accentWash};
      color: ${VIZ.accent};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex: 0 0 auto;
    }

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: ${VIZ.text};
    }

    .extra {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
  }

  > .section-body {
    padding: 20px;
  }

  @media (max-width: 576px) {
    > .section-head,
    > .section-body {
      padding-left: 14px;
      padding-right: 14px;
    }
  }
`;

export const DashSection = ({
  title,
  icon,
  info,
  extra,
  children,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  info?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => {
  const id = useId();
  return (
    <SectionBox aria-labelledby={id} className={className}>
      <div className="section-head">
        <div className="title">
          {icon && (
            <span className="title-icon" aria-hidden>
              {icon}
            </span>
          )}
          <h2 id={id}>{title}</h2>
          {info && <InfoTip text={info} />}
        </div>
        {extra && <div className="extra">{extra}</div>}
      </div>
      <div className="section-body">{children}</div>
    </SectionBox>
  );
};

const PanelBox = styled.div`
  border: 1px solid #edf1f5;
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
  background: #ffffff;

  > .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
  }
`;

/** A titled block inside a section */
export const Panel = ({
  title,
  info,
  extra,
  children,
}: {
  title: React.ReactNode;
  info?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <PanelBox>
    <div className="panel-head">
      <div className="title">
        <h3>{title}</h3>
        {info && <InfoTip text={info} />}
      </div>
      {extra}
    </div>
    {children}
  </PanelBox>
);

export const PanelGrid = styled.div<{ $min?: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, ${p => p.$min ?? 300}px), 1fr)
  );
  gap: 16px;
  align-items: start;
`;

export const Stack = styled.div<{ $gap?: number }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${p => p.$gap ?? 16}px;
  min-width: 0;
`;

export const SubHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 700;
  color: ${VIZ.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;

  .note {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
    color: ${VIZ.textMuted};
  }
`;

export const Caption = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${VIZ.textMuted};
`;

export const RangeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: ${VIZ.accentWash};
  border: 1px solid ${VIZ.accentTrack};
  color: ${VIZ.accentStrong};
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
`;

/* ------------------------------------------------------------ stat tile */

export const StatGrid = styled.div<{ $min?: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, ${p => p.$min ?? 200}px), 1fr)
  );
  gap: 14px;
`;

const TileBox = styled.div<{ $wash: string; $ink: string }>`
  border: 1px solid #edf1f5;
  border-radius: 12px;
  padding: 14px 16px;
  background: #ffffff;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;

  .tile-icon {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${p => p.$wash};
    color: ${p => p.$ink};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
  }

  .tile-text {
    min-width: 0;
    flex: 1;
  }

  .tile-label {
    font-size: 13px;
    color: ${VIZ.textMuted};
    line-height: 1.35;
  }

  .tile-value {
    font-size: 24px;
    font-weight: 700;
    color: ${VIZ.text};
    line-height: 1.25;
    margin-top: 2px;
    overflow-wrap: anywhere;
  }

  .tile-value.is-text {
    font-size: 15px;
    font-weight: 600;
    color: ${VIZ.textSecondary};
    padding-top: 4px;
  }

  .tile-caption {
    margin-top: 4px;
    font-size: 12.5px;
    color: ${VIZ.textMuted};
    line-height: 1.45;
  }
`;

export const StatTile = ({
  label,
  value,
  caption,
  icon,
  tone = 'teal',
  textValue = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  /** A sentence instead of a number ("Chưa có dữ liệu") */
  textValue?: boolean;
}) => {
  const [wash, ink] = TONES[tone];
  return (
    <TileBox $wash={wash} $ink={ink}>
      {icon && (
        <span className="tile-icon" aria-hidden>
          {icon}
        </span>
      )}
      <div className="tile-text">
        <div className="tile-label">{label}</div>
        <div className={`tile-value${textValue ? ' is-text' : ''}`}>
          {value}
        </div>
        {caption && <div className="tile-caption">{caption}</div>}
      </div>
    </TileBox>
  );
};

const DeltaText = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${p => p.$color};
`;

/** Signed change against a named period; arrow + sign, so not colour alone */
export const Delta = ({
  value,
  text,
}: {
  value: number;
  text: (formatted: string) => React.ReactNode;
}) => {
  const up = value >= 0;
  const formatted = `${up ? '+' : '−'}${Math.abs(value).toLocaleString(
    'vi-VN',
    {
      maximumFractionDigits: 1,
    }
  )}%`;
  return (
    <DeltaText $color={up ? VIZ.good : VIZ.critical}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {text(formatted)}
    </DeltaText>
  );
};

/* ------------------------------------------------------------- bar list */

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;

  li {
    min-width: 0;
  }

  .row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }

  .name {
    font-size: 13.5px;
    color: #334155;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .figure {
    font-size: 13.5px;
    font-weight: 650;
    color: ${VIZ.text};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .sub {
    display: block;
    font-size: 12px;
    font-weight: 400;
    color: ${VIZ.textMuted};
  }

  .track {
    height: 8px;
    border-radius: 9999px;
    background: ${VIZ.accentWash};
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 9999px;
    background: ${VIZ.accent};
    min-width: 0;
  }

  .tone-icon {
    margin-right: 6px;
    font-size: 13px;
  }

  /* Used and free as two parts, a 2px surface gap between them */
  .capacity {
    display: flex;
    gap: 2px;
    height: 10px;
    border-radius: 9999px;
    overflow: hidden;
    background: #f1f5f9;
  }

  .capacity span {
    height: 100%;
    min-width: 0;
  }

  .capacity .used {
    background: ${VIZ.accent};
  }

  .capacity .free {
    background: ${VIZ.accentTrack};
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: ${VIZ.textSecondary};

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
  }
`;

const EmptyLine = styled.p`
  margin: 0;
  padding: 12px 0;
  color: #94a3b8;
  font-size: 13px;
`;

export interface BarItem {
  key: string;
  label: React.ReactNode;
  value: number;
  display: React.ReactNode;
  sub?: React.ReactNode;
  /** A state that needs attention: its bar takes the status colour + icon */
  tone?: 'warning' | 'critical';
}

const TONE_STYLE = {
  warning: { color: VIZ.warning, icon: <ExclamationCircleOutlined /> },
  critical: { color: VIZ.critical, icon: <CloseCircleOutlined /> },
} as const;

const share = (value: number, whole: number) =>
  whole > 0 && Number.isFinite(value)
    ? Math.max(0, Math.min(100, (value / whole) * 100))
    : 0;

/**
 * One named row per part: name, figure, and a bar against `whole` (the total)
 * or, without it, against the largest row
 */
export const BarList = ({
  items,
  whole,
  emptyText = 'Chưa có dữ liệu trong kỳ.',
}: {
  items: BarItem[];
  whole?: number;
  emptyText?: string;
}) => {
  if (!items.length) return <EmptyLine>{emptyText}</EmptyLine>;
  const top = whole ?? Math.max(0, ...items.map(item => item.value));
  return (
    <List>
      {items.map(item => {
        const tone = item.tone ? TONE_STYLE[item.tone] : undefined;
        return (
          <li key={item.key}>
            <div className="row-head">
              <span className="name">
                {tone && (
                  <span
                    className="tone-icon"
                    style={{ color: tone.color }}
                    aria-hidden
                  >
                    {tone.icon}
                  </span>
                )}
                {item.label}
              </span>
              <span className="figure">
                {item.display}
                {item.sub && <span className="sub">{item.sub}</span>}
              </span>
            </div>
            <div className="track" aria-hidden>
              <div
                className="fill"
                style={{
                  width: `${share(item.value, top)}%`,
                  ...(tone ? { background: tone.color } : {}),
                }}
              />
            </div>
          </li>
        );
      })}
    </List>
  );
};

export interface MeterItem {
  key: string;
  label: React.ReactNode;
  used: number;
  total: number;
  caption?: React.ReactNode;
}

/**
 * Capacity per named row (cages in use of total): one bar split into "in use"
 * and "free" (24/11), same hue, the free part a light step of it
 */
export const MeterList = ({
  items,
  usedLabel = 'Đang dùng',
  freeLabel = 'Còn trống',
}: {
  items: MeterItem[];
  usedLabel?: string;
  freeLabel?: string;
}) => (
  <>
    <LegendRow aria-hidden>
      <span>
        <i style={{ background: VIZ.accent }} />
        {usedLabel}
      </span>
      <span>
        <i style={{ background: VIZ.accentTrack }} />
        {freeLabel}
      </span>
    </LegendRow>
    <List>
      {items.map(item => {
        const used = Math.max(0, Math.min(item.used, item.total));
        const free = Math.max(0, item.total - used);
        return (
          <li key={item.key}>
            <div className="row-head">
              <span className="name">{item.label}</span>
              <span className="figure">
                {item.used.toLocaleString('vi-VN')}/
                {item.total.toLocaleString('vi-VN')}
              </span>
            </div>
            <div
              className="capacity"
              role="img"
              aria-label={`${typeof item.label === 'string' ? item.label : ''}: ${usedLabel.toLowerCase()} ${used}, ${freeLabel.toLowerCase()} ${free}`}
            >
              {used > 0 && <span className="used" style={{ flexGrow: used }} />}
              {free > 0 && <span className="free" style={{ flexGrow: free }} />}
            </div>
            {item.caption && (
              <Caption style={{ marginTop: 5 }}>{item.caption}</Caption>
            )}
          </li>
        );
      })}
    </List>
  </>
);

/* ------------------------------------------------------------ split bar */

const SplitBox = styled.div`
  .split {
    display: flex;
    gap: 2px;
    height: 8px;
    border-radius: 9999px;
    overflow: hidden;
    background: #ffffff;
  }

  .split.is-empty {
    background: #f1f5f9;
  }

  .split span {
    height: 100%;
    min-width: 2px;
  }

  ul {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: #334155;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex: 0 0 auto;
  }

  .value {
    margin-left: auto;
    font-weight: 650;
    color: ${VIZ.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .muted {
    font-weight: 400;
    color: ${VIZ.textMuted};
  }
`;

/** One whole split in parts, read beside its figures (thin bar, no text on it) */
export const SplitBar = ({
  parts,
  label,
}: {
  parts: {
    key: string;
    label: string;
    value: number;
    color: string;
    note?: string;
  }[];
  label: string;
}) => {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <SplitBox>
      <div
        className={`split${total ? '' : ' is-empty'}`}
        role="img"
        aria-label={`${label}: ${parts
          .map(part => `${part.label} ${part.value}`)
          .join(', ')}`}
      >
        {parts
          .filter(part => part.value > 0)
          .map(part => (
            <span
              key={part.key}
              style={{ flexGrow: part.value, background: part.color }}
            />
          ))}
      </div>
      <ul>
        {parts.map(part => (
          <li key={part.key}>
            <span
              className="swatch"
              style={{ background: part.color }}
              aria-hidden
            />
            {part.label}
            <span className="value">
              {part.value.toLocaleString('vi-VN')}
              {part.note && <span className="muted"> · {part.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </SplitBox>
  );
};

/* --------------------------------------------------------- column chart */

const ChartBox = styled.div<{ $height: number }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 10px;

  .y-axis {
    position: relative;
    height: ${p => p.$height}px;
    font-size: 11.5px;
    color: ${VIZ.textMuted};
    font-variant-numeric: tabular-nums;
    text-align: right;
    min-width: 36px;

    span {
      position: absolute;
      right: 0;
      transform: translateY(-50%);
      white-space: nowrap;
    }
  }

  .plot {
    position: relative;
    height: ${p => p.$height}px;
    border-bottom: 1px solid #cbd5e1;
  }

  .gridline {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: ${VIZ.grid};
  }

  .columns {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: stretch;
  }

  .slot {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    cursor: default;
    outline: none;
    border-radius: 4px;

    &:hover,
    &:focus-visible {
      background: rgba(13, 148, 136, 0.06);
    }

    &:hover .bar,
    &:focus-visible .bar {
      background: ${VIZ.accentStrong};
    }
  }

  .bar {
    width: min(24px, 64%);
    min-width: 1px;
    border-radius: 4px 4px 0 0;
    background: ${VIZ.accent};
  }

  .x-axis {
    grid-column: 2;
    display: flex;
    margin-top: 6px;
    font-size: 11.5px;
    color: ${VIZ.textMuted};
    font-variant-numeric: tabular-nums;

    span {
      flex: 1 1 0;
      min-width: 0;
      text-align: center;
      white-space: nowrap;
      overflow: visible;
    }
  }
`;

const TooltipBody = styled.div`
  font-size: 12.5px;
  line-height: 1.5;

  strong {
    display: block;
    font-size: 14px;
  }
`;

export interface ColumnPoint {
  key: string;
  /** Full name of the period, e.g. 01/11/2026 */
  label: string;
  /** Short axis label, e.g. 01/11 */
  tick: string;
  value: number;
  /** Value as text, e.g. 1.200.000 ₫ */
  display: string;
  sub?: string;
}

/** A clean upper bound for the y-axis: 1, 2, 2.5 or 5 × 10^n */
export const niceCeil = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(s => s * power >= value) ?? 10;
  return step * power;
};

const compact = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

/** Single-series columns over time; each column is its own hover/focus target */
export const ColumnChart = ({
  points,
  height = 190,
  ariaLabel,
  maxTicks = 8,
}: {
  points: ColumnPoint[];
  height?: number;
  ariaLabel: string;
  maxTicks?: number;
}) => {
  const top = niceCeil(Math.max(0, ...points.map(point => point.value)));
  const every = Math.max(1, Math.ceil(points.length / maxTicks));
  return (
    <ChartBox $height={height} role="group" aria-label={ariaLabel}>
      <div className="y-axis" aria-hidden>
        {[1, 0.5, 0].map(ratio => (
          <span key={ratio} style={{ top: `${(1 - ratio) * 100}%` }}>
            {compact(top * ratio)}
          </span>
        ))}
      </div>
      <div className="plot">
        {[1, 0.5].map(ratio => (
          <div
            key={ratio}
            className="gridline"
            style={{ top: `${(1 - ratio) * 100}%` }}
            aria-hidden
          />
        ))}
        <div className="columns">
          {points.map(point => (
            <Tooltip
              key={point.key}
              mouseEnterDelay={0}
              title={
                <TooltipBody>
                  <strong>{point.display}</strong>
                  {point.label}
                  {point.sub && <div>{point.sub}</div>}
                </TooltipBody>
              }
            >
              <div
                className="slot"
                tabIndex={0}
                aria-label={`${point.label}: ${point.display}${
                  point.sub ? `, ${point.sub}` : ''
                }`}
              >
                {point.value > 0 && (
                  <div
                    className="bar"
                    style={{ height: `${(point.value / top) * 100}%` }}
                  />
                )}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="x-axis" aria-hidden>
        {points.map((point, index) => (
          <span key={point.key}>
            {showTick(index, points.length, every) ? point.tick : ''}
          </span>
        ))}
      </div>
    </ChartBox>
  );
};

/* ----------------------------------------------------------- line chart */

const LINE_BOX_WIDTH = 1000;

const LineBox = styled(ChartBox)`
  .line-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .area {
    fill: ${VIZ.accent};
    fill-opacity: 0.1;
  }

  .stroke {
    fill: none;
    stroke: ${VIZ.accent};
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .slot {
    position: relative;
  }

  .hair {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: #94a3b8;
    opacity: 0;
  }

  .dot {
    position: absolute;
    left: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${VIZ.accent};
    box-shadow: 0 0 0 2px #ffffff;
    transform: translate(-50%, 50%);
    opacity: 0;
  }

  .slot:hover .hair,
  .slot:focus-visible .hair,
  .slot:hover .dot,
  .slot:focus-visible .dot,
  .slot.is-last .dot {
    opacity: 1;
  }
`;

/**
 * Single-series line over time with a light area under it (24/11, long
 * ranges): each point is a hover/focus slot showing a crosshair and its value
 */
export const LineChart = ({
  points,
  height = 190,
  ariaLabel,
  maxTicks = 8,
}: {
  points: ColumnPoint[];
  height?: number;
  ariaLabel: string;
  maxTicks?: number;
}) => {
  const top = niceCeil(Math.max(0, ...points.map(point => point.value)));
  const every = Math.max(1, Math.ceil(points.length / maxTicks));
  const { line, area } = trendPaths(
    points.map(point => point.value),
    top,
    LINE_BOX_WIDTH,
    height
  );
  return (
    <LineBox $height={height} role="group" aria-label={ariaLabel}>
      <div className="y-axis" aria-hidden>
        {[1, 0.5, 0].map(ratio => (
          <span key={ratio} style={{ top: `${(1 - ratio) * 100}%` }}>
            {compact(top * ratio)}
          </span>
        ))}
      </div>
      <div className="plot">
        {[1, 0.5].map(ratio => (
          <div
            key={ratio}
            className="gridline"
            style={{ top: `${(1 - ratio) * 100}%` }}
            aria-hidden
          />
        ))}
        <svg
          className="line-svg"
          viewBox={`0 0 ${LINE_BOX_WIDTH} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path className="area" d={area} />
          <path className="stroke" d={line} />
        </svg>
        <div className="columns">
          {points.map((point, index) => (
            <Tooltip
              key={point.key}
              mouseEnterDelay={0}
              title={
                <TooltipBody>
                  <strong>{point.display}</strong>
                  {point.label}
                  {point.sub && <div>{point.sub}</div>}
                </TooltipBody>
              }
            >
              <div
                className={`slot${index === points.length - 1 ? ' is-last' : ''}`}
                tabIndex={0}
                aria-label={`${point.label}: ${point.display}${
                  point.sub ? `, ${point.sub}` : ''
                }`}
              >
                <span className="hair" aria-hidden />
                <span
                  className="dot"
                  aria-hidden
                  style={{
                    bottom: `${(Math.max(0, point.value) / top) * 100}%`,
                  }}
                />
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="x-axis" aria-hidden>
        {points.map((point, index) => (
          <span key={point.key}>
            {showTick(index, points.length, every) ? point.tick : ''}
          </span>
        ))}
      </div>
    </LineBox>
  );
};

/**
 * Change over time (24/11): columns for a few periods (≤ 14), a line with its
 * area for longer ranges, where the trend matters more than each period
 */
export const TrendChart = (props: {
  points: ColumnPoint[];
  height?: number;
  ariaLabel: string;
  maxTicks?: number;
}) =>
  trendAsLine(props.points.length) ? (
    <LineChart {...props} />
  ) : (
    <ColumnChart {...props} />
  );

/* ---------------------------------------------------------------- donut */

/** Categorical slots in fixed order: colour follows the entity, not its rank */
export const CATEGORICAL = [VIZ.accent, VIZ.series2, VIZ.series3] as const;

// 24/11: wide enough for the exact total (e.g. 1.234.567.890 ₫) in the middle
const DONUT_SIZE = 172;
const DONUT_STROKE = 20;
const DONUT_GAP = 2;

const DonutBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;

  .ring {
    position: relative;
    flex: 0 0 auto;
    width: ${DONUT_SIZE}px;
    height: ${DONUT_SIZE}px;
    margin: 0 auto;
  }

  .ring svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .slice {
    fill: none;
    transition: stroke-width 0.15s;
  }

  .slice:hover {
    stroke-width: ${DONUT_STROKE + 4}px;
  }

  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 ${DONUT_STROKE + 6}px;
    pointer-events: none;
  }

  .center-value {
    font-size: 14px;
    font-weight: 700;
    color: ${VIZ.text};
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .center-label {
    margin-top: 2px;
    font-size: 11.5px;
    color: ${VIZ.textMuted};
  }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1 1 200px;
    min-width: 0;
    display: grid;
    gap: 10px;
  }

  .legend li {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    column-gap: 8px;
    align-items: baseline;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    align-self: center;
  }

  .name {
    font-size: 13.5px;
    color: #334155;
    overflow-wrap: anywhere;
  }

  .figure {
    font-size: 13.5px;
    font-weight: 650;
    color: ${VIZ.text};
    white-space: nowrap;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .sub {
    grid-column: 2 / 4;
    font-size: 12px;
    color: ${VIZ.textMuted};
  }
`;

export interface DonutPart {
  key: string;
  label: string;
  value: number;
  /** Value as text, e.g. 1.200.000 ₫ */
  display: string;
  sub?: string;
}

/**
 * One whole in at most 3 parts, read at a glance (24/11): ring with 2px gaps,
 * the total in the middle, a legend with each part's figure and share. Pass
 * the parts in a fixed order, so a part keeps its colour from one period to
 * the next.
 */
export const DonutChart = ({
  parts,
  ariaLabel,
  centerLabel,
  centerValue,
  format,
  emptyText = 'Chưa có dữ liệu trong kỳ.',
}: {
  parts: DonutPart[];
  ariaLabel: string;
  centerLabel: string;
  centerValue: string;
  /** Formats a folded "Khác" value */
  format: (value: number) => string;
  emptyText?: string;
}) => {
  const shown = foldParts(parts, CATEGORICAL.length, format) as DonutPart[];
  const radius = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = donutArcs(shown, circumference, DONUT_GAP);
  if (!arcs.length) return <EmptyLine>{emptyText}</EmptyLine>;
  const color = (key: string) =>
    key === 'other'
      ? VIZ.textMuted
      : CATEGORICAL[shown.findIndex(part => part.key === key)];
  const shareOf = (key: string) =>
    arcs.find(arc => arc.key === key)?.share ?? 0;
  return (
    <DonutBox>
      <div className="ring">
        <svg
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          role="img"
          aria-label={`${ariaLabel}: ${shown
            .map(
              part =>
                `${part.label} ${part.display} (${shareText(shareOf(part.key))})`
            )
            .join(', ')}`}
        >
          {arcs.map(arc => {
            const part = shown.find(p => p.key === arc.key)!;
            return (
              <Tooltip
                key={arc.key}
                mouseEnterDelay={0}
                title={
                  <TooltipBody>
                    <strong>{part.display}</strong>
                    {part.label} · {shareText(arc.share)}
                    {part.sub && <div>{part.sub}</div>}
                  </TooltipBody>
                }
              >
                <circle
                  className="slice"
                  cx={DONUT_SIZE / 2}
                  cy={DONUT_SIZE / 2}
                  r={radius}
                  stroke={color(arc.key)}
                  strokeWidth={DONUT_STROKE}
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.start}
                />
              </Tooltip>
            );
          })}
        </svg>
        <div className="center" aria-hidden>
          <span className="center-value">{centerValue}</span>
          <span className="center-label">{centerLabel}</span>
        </div>
      </div>
      <ul className="legend">
        {shown.map(part => (
          <li key={part.key}>
            <span
              className="swatch"
              style={{ background: color(part.key) }}
              aria-hidden
            />
            <span className="name">{part.label}</span>
            <span className="figure">
              {part.display} · {shareText(shareOf(part.key))}
            </span>
            {part.sub && <span className="sub">{part.sub}</span>}
          </li>
        ))}
      </ul>
    </DonutBox>
  );
};

/* ------------------------------------------------------------ parts bar */

const PartsBox = styled.div`
  .total-label {
    font-size: 12.5px;
    color: ${VIZ.textMuted};
  }

  .total-value {
    margin: 2px 0 12px;
    font-size: 22px;
    font-weight: 700;
    color: ${VIZ.text};
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .bar {
    display: flex;
    gap: 2px;
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
  }

  .bar > span {
    height: 100%;
    min-width: 3px;
    transition: opacity 0.15s;
  }

  .bar:hover > span {
    opacity: 0.6;
  }

  .bar > span:hover,
  .bar > span:focus-visible {
    opacity: 1;
    outline: none;
  }

  .legend {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .legend li {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    column-gap: 8px;
    align-items: baseline;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    align-self: center;
  }

  .name {
    font-size: 13.5px;
    color: #334155;
    overflow-wrap: anywhere;
  }

  .figure {
    font-size: 13.5px;
    font-weight: 650;
    color: ${VIZ.text};
    white-space: nowrap;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .sub {
    grid-column: 2 / 4;
    font-size: 12px;
    color: ${VIZ.textMuted};
  }
`;

/**
 * One whole split into at most 3 parts as one tall bar (24/11): the exact
 * total above, each part a block in its fixed colour, a legend with figures
 * and shares below. Pass the parts in a fixed order, as for the donut.
 */
export const PartsBar = ({
  parts,
  ariaLabel,
  totalLabel,
  totalValue,
  format,
  emptyText = 'Chưa có dữ liệu trong kỳ.',
}: {
  parts: DonutPart[];
  ariaLabel: string;
  totalLabel: string;
  totalValue: string;
  format: (value: number) => string;
  emptyText?: string;
}) => {
  const shown = foldParts(parts, CATEGORICAL.length, format) as DonutPart[];
  const total = shown.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  if (total <= 0) return <EmptyLine>{emptyText}</EmptyLine>;
  const color = (part: DonutPart, index: number) =>
    part.key === 'other' ? VIZ.textMuted : CATEGORICAL[index];
  const shareOf = (part: DonutPart) => Math.max(0, part.value) / total;
  return (
    <PartsBox>
      <div className="total-label">{totalLabel}</div>
      <div className="total-value">{totalValue}</div>
      <div
        className="bar"
        role="img"
        aria-label={`${ariaLabel}: ${shown
          .map(
            part =>
              `${part.label} ${part.display} (${shareText(shareOf(part))})`
          )
          .join(', ')}`}
      >
        {shown.map((part, index) =>
          part.value > 0 ? (
            <Tooltip
              key={part.key}
              mouseEnterDelay={0}
              title={
                <TooltipBody>
                  <strong>{part.display}</strong>
                  {part.label} · {shareText(shareOf(part))}
                  {part.sub && <div>{part.sub}</div>}
                </TooltipBody>
              }
            >
              <span
                style={{ flexGrow: part.value, background: color(part, index) }}
              />
            </Tooltip>
          ) : null
        )}
      </div>
      <ul className="legend">
        {shown.map((part, index) => (
          <li key={part.key}>
            <span
              className="swatch"
              style={{ background: color(part, index) }}
              aria-hidden
            />
            <span className="name">{part.label}</span>
            <span className="figure">
              {part.display} · {shareText(shareOf(part))}
            </span>
            {part.sub && <span className="sub">{part.sub}</span>}
          </li>
        ))}
      </ul>
    </PartsBox>
  );
};

/** The chart and its table twin, switched from the panel header */
export const useChartView = () => {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const toggle = (
    <Segmented<'chart' | 'table'>
      size="small"
      value={view}
      onChange={setView}
      options={[
        { value: 'chart', label: 'Biểu đồ' },
        { value: 'table', label: 'Bảng' },
      ]}
      aria-label="Kiểu hiển thị"
    />
  );
  return { view, toggle };
};

export const PointTable = ({
  points,
  periodTitle,
  valueTitle,
  subTitle,
}: {
  points: (ColumnPoint & { subValue?: React.ReactNode })[];
  periodTitle: string;
  valueTitle: string;
  subTitle?: string;
}) => {
  const columns = useMemo(
    () => [
      { title: periodTitle, dataIndex: 'label', key: 'label' },
      {
        title: valueTitle,
        dataIndex: 'display',
        key: 'display',
        align: 'right' as const,
      },
      ...(subTitle
        ? [
            {
              title: subTitle,
              dataIndex: 'subValue',
              key: 'subValue',
              align: 'right' as const,
            },
          ]
        : []),
    ],
    [periodTitle, valueTitle, subTitle]
  );
  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={points}
      columns={columns}
      pagination={false}
      scroll={{ y: 320 }}
    />
  );
};
