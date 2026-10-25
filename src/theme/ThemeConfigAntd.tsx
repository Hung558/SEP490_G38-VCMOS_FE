import { theme as antdTheme } from 'antd';
const { defaultAlgorithm, darkAlgorithm } = antdTheme;
const ColorPrimary = '#0d9488'; // Medical Clinical Teal (OpenVPM style)
const ColorDefault = '#ffffff';
const ThemeConfigAntd = (theme: string) => ({
  algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
  token: {
    colorInfo: ColorPrimary,
    colorPrimary: ColorPrimary,
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorLink: '#0d9488',
    colorLinkHover: '#0f766e',
    fontSize: 14,
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    colorBgBase: theme === 'dark' ? '#1e293b' : ColorDefault,
    colorIcon: theme === 'dark' ? ColorDefault : '#334155',
    colorTextBase: theme === 'dark' ? '#f1f5f9' : '#0f172a',
    lineHeight: 1.5,
    borderRadius: 8,
  },
  components: {
    Menu: {
      itemActiveBg: '#f0fdfa',
      colorPrimaryBorder: '#0d9488',
      itemSelectedBg: '#f0fdfa',
      itemSelectedColor: '#0d9488',
      collapsedIconSize: 18,
    },
    Button: {
      defaultBg: ColorDefault,
      borderRadius: 8,
      borderRadiusLG: 10,
      lineWidth: 1,
      controlHeight: 38,
      controlHeightLG: 44,
      controlHeightSM: 30,
      primaryShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      fontWeight: 600,
    },
    Table: {
      headerColor: '#334155',
      headerBg: '#f8fafc',
      cellPaddingInline: 14,
      cellPaddingBlock: 12,
      headerBorderRadius: 8,
      borderRadius: 8,
      fontSize: 14,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Tooltip: {
      colorBgSpotlight: '#0f172a',
      colorText: '#ffffff',
    },
  },
});

export default ThemeConfigAntd;
