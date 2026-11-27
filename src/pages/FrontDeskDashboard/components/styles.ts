import styled from 'styled-components';
import { VIZ } from '@/components/dashboard';

export const Page = styled.main`
  padding: 24px;
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;

  @media (max-width: 576px) {
    padding: 16px 12px;
  }
`;

export const TopGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;

  > section {
    height: 100%;
  }

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 12px;
`;

export const ActionTile = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${p => (p.$primary ? VIZ.accent : VIZ.border)};
  background: ${p => (p.$primary ? VIZ.accent : '#ffffff')};
  color: ${p => (p.$primary ? '#ffffff' : VIZ.text)};
  font-size: 14px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  .icon {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    background: ${p =>
      p.$primary ? 'rgba(255,255,255,0.16)' : VIZ.accentWash};
    color: ${p => (p.$primary ? '#ffffff' : VIZ.accent)};
  }

  .arrow {
    margin-left: auto;
    opacity: 0.6;
    font-size: 12px;
  }

  &:hover {
    border-color: ${VIZ.accent};
    background: ${p => (p.$primary ? VIZ.accentStrong : VIZ.accentWash)};
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  &:focus-visible {
    outline: 2px solid ${VIZ.accent};
    outline-offset: 2px;
  }
`;

export const CageFigures = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  .figure-label {
    font-size: 12.5px;
    color: ${VIZ.textMuted};
  }

  .figure-value {
    font-size: 24px;
    font-weight: 700;
    color: ${VIZ.text};
    line-height: 1.3;
  }

  .figure-value.is-key {
    color: ${VIZ.accentStrong};
  }
`;

export const Meter = styled.div`
  .meter-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    color: ${VIZ.textSecondary};
    margin-bottom: 6px;

    strong {
      color: ${VIZ.text};
      font-variant-numeric: tabular-nums;
    }
  }

  .meter-track {
    height: 10px;
    border-radius: 9999px;
    background: ${VIZ.accentTrack};
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    border-radius: 9999px;
    background: ${VIZ.accent};
  }
`;

export const FilterBar = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 16px;
  margin-bottom: 20px;

  .field {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .field label {
    font-size: 12.5px;
    font-weight: 600;
    color: ${VIZ.textSecondary};
  }

  .ant-input {
    width: 170px;
  }

  .apply {
    align-self: flex-end;
  }

  @media (max-width: 576px) {
    .ant-segmented {
      max-width: 100%;
      overflow-x: auto;
    }
    .ant-segmented-group {
      width: max-content;
      min-width: 100%;
    }

    .field,
    .ant-input,
    .apply {
      width: 100%;
    }
  }
`;

export const FieldError = styled.p`
  color: #b42318;
  margin: 2px 0 0;
  max-width: 280px;
  font-size: 12.5px;
`;

export const FigureGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 16px;

  > div {
    background: #f8fafc;
    border-radius: 10px;
    padding: 10px 12px;
    min-width: 0;
  }

  dt {
    font-size: 12.5px;
    color: ${VIZ.textMuted};
    line-height: 1.35;
  }

  dd {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 700;
    color: ${VIZ.text};
    overflow-wrap: anywhere;
  }

  @media (max-width: 400px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Divider = styled.div`
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0 14px;
`;
