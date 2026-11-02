import styled from 'styled-components';

export const PageWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 16px;
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

export const SearchControl = styled.div`
  flex: 1 1 280px;
  min-width: 240px;
`;

export const FilterControl = styled.div`
  width: 180px;

  @media (max-width: 576px) {
    width: 100%;
  }
`;
