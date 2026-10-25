import { Layout } from 'antd';
import styled from 'styled-components';
import HomeHeader from './components/HomeHeader';
import HomeFooter from './components/HomeFooter';

const { Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background-color: #f9f9ff;
`;

interface HomeLayoutProps {
  children: React.ReactNode;
  hideSearch?: boolean;
}

const HomeLayout = ({ children, hideSearch }: HomeLayoutProps) => {
  return (
    <StyledLayout>
      <HomeHeader hideSearch={hideSearch} />
      <Content>{children}</Content>
      <HomeFooter />
    </StyledLayout>
  );
};

export default HomeLayout;
