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
  margin-bottom: 16px;

  @media (max-width: 576px) {
    .ant-select {
      width: 100% !important;
    }
  }
`;

export const CellText = styled.div`
  .excerpt {
    margin: 4px 0 0;
    max-width: 380px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: #1e293b;
  }

  .sub {
    display: block;
    color: #64748b;
    font-size: 12.5px;
    overflow-wrap: anywhere;
  }

  .sensitive {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
`;

// The TextArea count sits 22px under the box: the padding keeps it off the footer
export const NoteField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding-bottom: 22px;

  .ant-alert {
    margin-top: 22px;
  }
`;
