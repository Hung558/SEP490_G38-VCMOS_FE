import styled from 'styled-components';

export const CommunityPageWrapper = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 16px 56px;

  .community-tabs .ant-tabs-nav {
    margin-bottom: 20px;
  }

  .community-feed {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .community-pagination {
    margin-top: 24px;
    text-align: center;
  }
`;

export const IntroWrapper = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  .intro-tag {
    display: inline-block;
    margin-bottom: 10px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #0d9488;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 9999px;
  }

  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
  }

  .intro-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;
