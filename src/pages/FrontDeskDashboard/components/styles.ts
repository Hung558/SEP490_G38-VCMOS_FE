import styled from 'styled-components';

export const Page = styled.main`
  padding: 24px;
  max-width: 1560px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
`;
export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  h1,
  h2 {
    margin: 0 0 8px !important;
  }
`;
export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-top: 16px;
  .ant-card {
    height: 100%;
  }
  .ant-statistic-title {
    color: #475569;
    min-height: 44px;
    font-size: 14px;
  }
  .ant-statistic-content {
    color: #0f172a;
    font-weight: 650;
  }
`;
export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  gap: 20px;
  align-items: start;
`;
export const FilterLayout = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  > div {
    min-width: 190px;
  }
  label {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .ant-select {
    width: 220px;
  }
  .ant-input {
    min-height: 32px;
  }
  button {
    margin-top: 28px;
  }
`;
export const FieldError = styled.p`
  color: #b42318;
  margin: 6px 0 0;
  max-width: 280px;
`;
export const Help = styled.p`
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
  margin: 10px 0 0;
`;
export const StatusList = styled.dl`
  margin: 0;
  display: grid;
  gap: 12px;
  > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  dt {
    color: #334155;
  }
  dd {
    margin: 0;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
`;
