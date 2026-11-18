import styled from 'styled-components';

export const PageWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 16px;
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
