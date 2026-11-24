import styled from 'styled-components';
import { APP_FONT_FAMILY } from '@/theme/ThemeConfigAntd';

/**
 * Title of every page in the sidebar layout, for every role (24/11): one font,
 * one size, one weight. Spacing around it stays with each page.
 */
const PageTitle = styled.h1`
  margin: 0;
  font-family: ${APP_FONT_FAMILY};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: #0f172a;

  @media (max-width: 640px) {
    font-size: 20px;
  }
`;

export default PageTitle;
