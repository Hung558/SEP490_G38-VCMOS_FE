import styled, { css } from 'styled-components';

// Owner dashboard action buttons (yêu cầu 17/11, 24/11): one look in the
// tables and in the pet detail dialog. act-view: open, act-book: book (main),
// act-add: add / journal, act-edit: edit, act-cancel: cancel or delete.
const actionColors = css`
  && .act-view {
    color: #0f766e;
    background: #f0fdfa;
    border-color: #99f6e4;
  }
  && .act-view:not(:disabled):hover {
    color: #0d9488;
    background: #ccfbf1;
    border-color: #5eead4;
  }

  && .act-add {
    color: #0369a1;
    background: #f0f9ff;
    border-color: #bae6fd;
  }
  && .act-add:not(:disabled):hover {
    color: #0284c7;
    background: #e0f2fe;
    border-color: #7dd3fc;
  }

  && .act-book {
    color: #ffffff;
    background: #0d9488;
    border-color: #0d9488;
  }
  && .act-book:not(:disabled):hover {
    color: #ffffff;
    background: #0f766e;
    border-color: #0f766e;
  }

  && .act-edit {
    color: #334155;
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  && .act-edit:not(:disabled):hover {
    color: #0f172a;
    background: #f1f5f9;
    border-color: #94a3b8;
  }

  && .act-cancel {
    color: #b91c1c;
    background: #fef2f2;
    border-color: #fecaca;
  }
  && .act-cancel:not(:disabled):hover {
    color: #dc2626;
    background: #fee2e2;
    border-color: #fca5a5;
  }
  && .act-cancel:disabled {
    color: #94a3b8;
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  /* Two rows: the main actions, then edit and delete */
  .action-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
`;

/** Action cell of a table row: small buttons */
export const RowActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  &.stacked {
    flex-direction: column;
    align-items: flex-start;
  }

  && .ant-btn {
    height: 28px;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: none;
  }

  ${actionColors}
`;

/** Footer of a dialog: regular size buttons, rows aligned to the right */
export const DialogActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  .action-row {
    justify-content: flex-end;
  }

  && .ant-btn {
    margin-inline-start: 0;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: none;
  }

  ${actionColors}
`;
