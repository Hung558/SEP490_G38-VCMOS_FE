// App.tsx
import { useTheme } from '@/contexts/routerProvider/themeContext';
import { ConfigProvider } from 'antd';
import ThemeConfigAntd from './ThemeConfigAntd';

function GlobalThemeConfig({ ...rest }) {
  const { theme } = useTheme();
  return (
    <ConfigProvider theme={ThemeConfigAntd(theme)}>
      {rest.children}
    </ConfigProvider>
  );
}

export default GlobalThemeConfig;
