import styled from 'styled-components';

export const DetailWrapper = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: 24px 16px 56px;

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
    color: #0d9488;
    font-weight: 600;
  }

  .post-card {
    padding: 22px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .post-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    min-width: 0;
  }

  .post-author {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    overflow-wrap: anywhere;
  }

  .post-meta {
    display: block;
    font-size: 13px;
    color: #64748b;
  }

  .post-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;

    .comment-count {
      color: #475569;
    }

    .post-actions-right {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-left: auto;
    }
  }

  .comments {
    margin-top: 24px;
    padding: 22px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    scroll-margin-top: 84px;
  }
`;

export const CommentWrapper = styled.div<{ $reply?: boolean }>`
  display: flex;
  gap: 10px;
  padding: ${props => (props.$reply ? '10px 0 0' : '14px 0')};
  border-top: ${props => (props.$reply ? 'none' : '1px solid #f1f5f9')};

  .comment-main {
    flex: 1;
    min-width: 0;
  }

  .comment-bubble {
    display: inline-block;
    max-width: 100%;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 12px;
  }

  .comment-author {
    display: block;
    font-weight: 700;
    color: #0f172a;
    font-size: 14px;
  }

  .comment-text {
    margin: 2px 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: #1e293b;
  }

  .comment-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin-top: 4px;
    font-size: 13px;
    color: #64748b;

    .ant-btn-link {
      padding: 0;
      height: auto;
      font-size: 13px;
    }
  }

  .comment-replies {
    margin-top: 4px;
    padding-left: 12px;
    border-left: 2px solid #e2e8f0;
  }
`;

export const CommentFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0 4px;

  .comment-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
`;
