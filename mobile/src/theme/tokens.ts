/**
 * PDF44 design tokens — ported verbatim from design-reference/tokens/*.css.
 * Dark is the default brand surface; light is a full mirror.
 */

export const palette = {
  dark: {
    bg: '#0a0a0f',
    bg2: '#12121a',
    bg3: '#1a1a2e',
    bgElev: '#1e1e2e',
    bgGlass: 'rgba(255,255,255,0.04)',
    bgGlassHover: 'rgba(255,255,255,0.07)',
    text: '#ffffff',
    text2: '#b8b8c8',
    text3: '#a0a0b8',
    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
    canvas: '#ffffff',
    code: '#0d0d18',
  },
  light: {
    bg: '#f7f8fc',
    bg2: '#ffffff',
    bg3: '#eef0f7',
    bgElev: '#ffffff',
    bgGlass: 'rgba(0,0,0,0.025)',
    bgGlassHover: 'rgba(0,0,0,0.05)',
    text: '#0f1729',
    text2: '#475569',
    text3: '#64748b',
    border: 'rgba(15,23,41,0.08)',
    borderStrong: 'rgba(15,23,41,0.15)',
    canvas: '#ffffff',
    code: '#f1f5f9',
  },
};

/** Brand accent family (red → coral → orange). Accent is tweakable. */
export const accents = {
  red: { accent: '#e5322d', accent2: '#ff5a52', accent3: '#ff7a45', glow: 'rgba(229,50,45,0.18)' },
  blue: { accent: '#3b82f6', accent2: '#60a5fa', accent3: '#93c5fd', glow: 'rgba(59,130,246,0.18)' },
  green: { accent: '#22c55e', accent2: '#4ade80', accent3: '#86efac', glow: 'rgba(34,197,94,0.18)' },
  purple: { accent: '#8b5cf6', accent2: '#a78bfa', accent3: '#c4b5fd', glow: 'rgba(139,92,246,0.18)' },
  orange: { accent: '#f97316', accent2: '#fb923c', accent3: '#fdba74', glow: 'rgba(249,115,22,0.18)' },
};
export type AccentKey = keyof typeof accents;

export const status = {
  dark: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444' },
  light: { success: '#16a34a', warning: '#d97706', error: '#dc2626' },
};

/** Tool-category icon-tile gradients: name -> [base, light]. */
export const toolGradients: Record<string, [string, string]> = {
  red: ['#ef4444', '#f87171'],
  orange: ['#f97316', '#fb923c'],
  yellow: ['#eab308', '#facc15'],
  green: ['#22c55e', '#4ade80'],
  teal: ['#14b8a6', '#2dd4bf'],
  cyan: ['#06b6d4', '#22d3ee'],
  blue: ['#3b82f6', '#60a5fa'],
  indigo: ['#6366f1', '#818cf8'],
  purple: ['#8b5cf6', '#a78bfa'],
  pink: ['#ec4899', '#f472b6'],
  rose: ['#f43f5e', '#fb7185'],
  slate: ['#64748b', '#94a3b8'],
};

export const spacing = {
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40, s12: 48, s16: 64,
};

export const radius = {
  xs: 6, sm: 10, md: 16, lg: 24, pill: 999,
};

export const fontSize = {
  f11: 11, f12: 12, f13: 13, f14: 14, f15: 15, f16: 16, f18: 18, f20: 20, f24: 24, f32: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extra: '800' as const,
};

export const motion = {
  durFast: 150,
  dur: 250,
  durSlow: 400,
};

/** Fonts bundled with the app (see android/app/src/main/assets/fonts). */
export const fontFamily = {
  sans: 'Inter',
  mono: 'JetBrainsMono',
};
