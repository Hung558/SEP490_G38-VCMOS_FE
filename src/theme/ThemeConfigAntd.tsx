import { theme as antdTheme } from 'antd';
const { defaultAlgorithm, darkAlgorithm } = antdTheme;
const ColorPrimary = '#00195c';
const ColorDefault = '#ffffff';
const ThemeConfigAntd = (theme: string) => ({
  algorithm: theme === 'dark' ? darkAlgorithm : defaultAlgorithm,
  token: {
    colorInfo: ColorPrimary,
    colorPrimary: ColorPrimary,
    fontSize: 14,
    fontFamily: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji","Inter", Helvetica, sans-serif`,
    colorBgBase: theme === 'dark' ? '#252525' : ColorDefault,
    colorIcon: theme === 'dark' ? ColorDefault : '#000',
    lineHeight: 1.5,
    borderRadius: 8,
  },
  components: {
    Menu: {
      itemActiveBg: 'rgb(216, 237, 236)',
      colorPrimaryBorder: 'rgb(141,253,245)',
      itemSelectedBg: 'rgb(217, 237, 236)',
      collapsedIconSize: 18,
    },
    Button: {
      defaultBg: ColorDefault,
      borderRadius: 10,
      borderRadiusLG: 10,
      lineWidth: 2,
      lineWidthFocus: 3,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      primaryShadow: 'none',
      fontWeight: 600,
    },
    Table: {
      headerColor: ColorDefault,
      headerBg: ColorPrimary,
      cellPaddingInline: 12,
      cellPaddingBlock: 8,
      headerBorderRadius: 4,
      borderRadius: 4,
      fontSize: 14,
    },
    Tooltip: {
      colorBgSpotlight: 'rgba(255,255,255)',
      colorText: 'rgba(255,255,255)',
      colorTextLightSolid: 'rgb(15, 154, 115)',
    },
  },
});

export default ThemeConfigAntd;
