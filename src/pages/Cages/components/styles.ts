import styled from 'styled-components';

export const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100%;

  @media (max-width: 576px) {
    padding: 12px;
  }
`;

export const FilterCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

export const ActionsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
