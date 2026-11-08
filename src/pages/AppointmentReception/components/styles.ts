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
  flex-wrap: wrap;
`;

export const ResponsiveFilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const FilterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

// One numbered step of the walk-in form (SCR-18)
export const SectionBlock = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px 16px 12px;
  margin-bottom: 16px;

  /* _custom-antd.scss sets every form item's margin to 0; the fields here need
     room between them and under the textarea character count (22px) */
  .ant-form-item {
    margin-bottom: 12px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 12px;
  }

  .section-step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #1677ff;
    color: #fff;
    font-size: 12px;
    flex-shrink: 0;
  }

  @media (max-width: 576px) {
    padding: 12px 12px 12px;
  }
`;

export const ServiceRowCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 12px 8px;
  margin-bottom: 12px;

  .row-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

export const ModalFooterBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
`;

// One service of an appointment in the detail modal (SCR-16 assignment)
export const OrderServiceCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;

  .service-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .service-meta {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-size: 13px;
  }

  .assign-row {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .assign-row .ant-select {
    flex: 1;
    min-width: 200px;
  }
`;
