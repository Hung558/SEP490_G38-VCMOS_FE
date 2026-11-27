import styled from 'styled-components';

export const PageWrapper = styled.div`
  padding: 32px;
  max-width: 1400px;
  min-width: 0;
  margin: 0 auto;

  @media (max-width: 576px) {
    padding: 12px;

    .ant-card-body {
      padding: 16px;
    }
    .ant-space-item {
      min-width: 0;
      max-width: 100%;
    }
    .account-filters {
      width: 100%;
    }
    .account-filters > .ant-space-item {
      width: 100%;
    }
    .account-filters .ant-input-search,
    .account-filters .ant-select {
      width: 100% !important;
    }
  }
`;
