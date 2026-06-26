/**
 * Builds react-native-paper MD3 themes from PDF44 tokens.
 * Accent maps to MD3 `primary`; surfaces map to the bg ramp.
 */
import {MD3DarkTheme, MD3LightTheme, MD3Theme} from 'react-native-paper';
import {accents, AccentKey, palette, status} from './tokens';

export interface Pdf44Colors {
  bg: string;
  bg2: string;
  bg3: string;
  bgElev: string;
  bgGlass: string;
  text: string;
  text2: string;
  text3: string;
  border: string;
  borderStrong: string;
  canvas: string;
  accent: string;
  accent2: string;
  accent3: string;
  accentGlow: string;
  success: string;
  warning: string;
  error: string;
}

export interface AppTheme extends MD3Theme {
  pdf44: Pdf44Colors;
  dark: boolean;
}

export function buildTheme(isDark: boolean, accentKey: AccentKey): AppTheme {
  const p = isDark ? palette.dark : palette.light;
  const a = accents[accentKey];
  const s = isDark ? status.dark : status.light;

  const pdf44: Pdf44Colors = {
    bg: p.bg,
    bg2: p.bg2,
    bg3: p.bg3,
    bgElev: p.bgElev,
    bgGlass: p.bgGlass,
    text: p.text,
    text2: p.text2,
    text3: p.text3,
    border: p.border,
    borderStrong: p.borderStrong,
    canvas: p.canvas,
    accent: a.accent,
    accent2: a.accent2,
    accent3: a.accent3,
    accentGlow: a.glow,
    success: s.success,
    warning: s.warning,
    error: s.error,
  };

  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    dark: isDark,
    pdf44,
    roundness: 4, // 16px card radius = roundness 4 * 4
    colors: {
      ...base.colors,
      primary: a.accent,
      onPrimary: '#ffffff',
      primaryContainer: a.accent,
      secondary: a.accent2,
      background: p.bg,
      surface: p.bg2,
      surfaceVariant: p.bg3,
      surfaceDisabled: p.bg3,
      elevation: {
        ...base.colors.elevation,
        level0: 'transparent',
        level1: p.bg2,
        level2: p.bg2,
        level3: p.bgElev,
        level4: p.bgElev,
        level5: p.bgElev,
      },
      onSurface: p.text,
      onSurfaceVariant: p.text2,
      onBackground: p.text,
      outline: p.borderStrong,
      outlineVariant: p.border,
      error: s.error,
    },
  };
}

export const accentList: {key: AccentKey; color: string}[] = [
  {key: 'red', color: accents.red.accent},
  {key: 'blue', color: accents.blue.accent},
  {key: 'green', color: accents.green.accent},
  {key: 'purple', color: accents.purple.accent},
  {key: 'orange', color: accents.orange.accent},
];
