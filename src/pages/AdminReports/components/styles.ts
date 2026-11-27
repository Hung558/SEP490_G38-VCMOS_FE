import styled from 'styled-components';
import { VIZ } from '@/components/dashboard';

export const PageWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
`;

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  @media (max-width: 576px) {
    .ant-picker,
    .ant-select {
      width: 100% !important;
    }
  }
`;

export const TabsBar = styled.div`
  background: #ffffff;
  border: 1px solid ${VIZ.border};
  border-radius: 14px;
  padding: 0 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  .ant-tabs-nav {
    margin: 0;
  }

  .ant-tabs-nav::before {
    border-bottom: none;
  }

  .ant-tabs-tab {
    padding: 14px 4px;
    font-weight: 600;
    color: ${VIZ.textSecondary};
  }

  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${VIZ.accentStrong};
  }

  .ant-tabs-ink-bar {
    background: ${VIZ.accent};
    height: 3px !important;
    border-radius: 3px 3px 0 0;
  }
`;

export const FilterCard = styled.div`
  background: #ffffff;
  border: 1px solid ${VIZ.border};
  border-radius: 14px;
  padding: 14px 16px;
  display: grid;
  gap: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .group-by {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding-left: 12px;
    border-left: 1px solid ${VIZ.border};

    .label {
      font-size: 13px;
      color: ${VIZ.textMuted};
    }
  }

  .reload {
    margin-left: auto;
  }

  .range {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  @media (max-width: 576px) {
    .filters {
      min-width: 0;
    }
    .ant-segmented {
      max-width: 100%;
      overflow-x: auto;
    }
    .ant-segmented-group {
      width: max-content;
      min-width: 100%;
    }

    .ant-picker {
      width: 100%;
    }

    .group-by {
      padding-left: 0;
      border-left: none;
    }

    .reload {
      margin-left: 0;
    }
  }
`;
