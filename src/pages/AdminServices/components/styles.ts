import styled from 'styled-components';

export const PageWrapper = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  @media (max-width: 575px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const SearchControl = styled.div`
  width: 300px;

  @media (max-width: 575px) {
    width: 100%;
  }
`;

export const FilterControl = styled.div`
  width: 200px;

  @media (max-width: 575px) {
    width: 100%;
  }
`;
