/**
 * Design tokens.
 *
 * Every colour, radius, spacing and type size in the app comes from here.
 * Screens never hard-code a colour — they read from the theme so light and
 * dark mode both work from one definition.
 *
 * The visual language is soft 3D: solid white cards that float on a cool
 * grey-blue backdrop with layered, navy-tinted shadows and a light top edge,
 * deep navy hero panels and buttons, and pale-blue icon wells.
 */

export const palette = {
  // Signature mint-to-teal accent, matching the fitness reference art.
  mint50: '#EAFBF4',
  mint100: '#C8F4E3',
  mint200: '#95E9CB',
  mint300: '#5CD9AE',
  mint400: '#2FC695',
  mint500: '#14B07D',
  mint600: '#0D8E66',
  mint700: '#0B6E51',

  // Warm coral for nutrition / calories.
  coral300: '#FFB4A2',
  coral400: '#FF8A75',
  coral500: '#F76C53',
  coral600: '#DB4E37',

  // Sky blue for hydration.
  sky300: '#8ECDF7',
  sky400: '#55B2F0',
  sky500: '#2B95DC',

  // Amber for streaks and achievements.
  amber300: '#FFD79A',
  amber400: '#FFBF5E',
  amber500: '#F5A524',

  // Violet for sleep and recovery.
  violet300: '#C4B5FD',
  violet400: '#A78BFA',
  violet500: '#8B5CF6',

  // Deep navy and pale blue: the premium light theme's main colours.
  navy950: '#0A1630',
  navy900: '#0F1F3D',
  navy800: '#16294D',
  navy700: '#1F3866',
  navy600: '#2B4A80',
  blue400: '#7FA6E8',
  blue300: '#A9C3F0',
  blue200: '#CCDCF6',
  blue100: '#E3ECFA',
  blue50: '#F1F5FD',

  // Neutrals tuned slightly cool so the glass reads as glass.
  ink950: '#070A0E',
  ink900: '#0B0F14',
  ink850: '#11161D',
  ink800: '#171E27',
  ink700: '#222B36',
  ink600: '#323D4B',
  ink500: '#4A5765',
  ink400: '#6B7888',
  ink300: '#94A1B2',
  ink200: '#C3CCD8',
  ink100: '#E4E9F0',
  ink50: '#F2F5F9',
  white: '#FFFFFF',
  black: '#000000',

  danger: '#F2545B',
  warning: '#F5A524',
  success: '#14B07D',
  info: '#2B95DC',
};

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;

  // Backdrop
  background: string;
  backgroundGradient: readonly [string, string, ...string[]];
  backdropOverlay: string;

  // Glass surfaces
  glass: string;
  glassStrong: string;
  glassBorder: string;
  glassHighlight: string;
  blurTint: 'light' | 'dark' | 'default';
  blurIntensity: number;

  // Solid surfaces
  card: string;
  cardElevated: string;
  surfaceMuted: string;
  border: string;
  divider: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnAccent: string;

  // Accents
  primary: string;
  primarySoft: string;
  primaryGradient: readonly [string, string];
  onPrimary: string;

  nutrition: string;
  nutritionSoft: string;
  hydration: string;
  hydrationSoft: string;
  streak: string;
  streakSoft: string;
  sleep: string;
  sleepSoft: string;

  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;

  // Effects
  shadowColor: string;
  glowColor: string;
  skeleton: string;
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;
  tabBarBackground: string;
  tabBarInactive: string;

  /**
   * Layered CSS box-shadows that give surfaces their 3D depth: a tight
   * contact shadow, a wide soft one, and a light inset edge along the top.
   */
  elevation: {
    card: string;
    raised: string;
    button: string;
    pressed: string;
  };
}

export const darkTheme: AppTheme = {
  mode: 'dark',

  background: palette.ink900,
  backgroundGradient: [palette.ink950, palette.ink900, '#0E1A1C'] as const,
  backdropOverlay: 'rgba(7,10,14,0.62)',

  glass: 'rgba(255,255,255,0.07)',
  glassStrong: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassHighlight: 'rgba(255,255,255,0.22)',
  blurTint: 'dark',
  blurIntensity: 40,

  card: 'rgba(23,30,39,0.86)',
  cardElevated: 'rgba(34,43,54,0.92)',
  surfaceMuted: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.10)',
  divider: 'rgba(255,255,255,0.07)',

  text: palette.white,
  textSecondary: palette.ink200,
  textTertiary: palette.ink400,
  textInverse: palette.ink900,
  textOnAccent: palette.ink950,

  primary: palette.mint300,
  primarySoft: 'rgba(92,217,174,0.16)',
  primaryGradient: [palette.mint300, palette.mint500] as const,
  onPrimary: palette.ink950,

  nutrition: palette.coral400,
  nutritionSoft: 'rgba(255,138,117,0.16)',
  hydration: palette.sky400,
  hydrationSoft: 'rgba(85,178,240,0.16)',
  streak: palette.amber400,
  streakSoft: 'rgba(255,191,94,0.16)',
  sleep: palette.violet400,
  sleepSoft: 'rgba(167,139,250,0.16)',

  danger: '#FF6B72',
  dangerSoft: 'rgba(255,107,114,0.16)',
  success: palette.mint300,
  warning: palette.amber400,

  shadowColor: '#000000',
  glowColor: palette.mint400,
  skeleton: 'rgba(255,255,255,0.08)',
  inputBackground: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.13)',
  inputPlaceholder: palette.ink400,
  tabBarBackground: 'rgba(11,15,20,0.80)',
  tabBarInactive: palette.ink400,

  elevation: {
    card: '0px 1px 2px rgba(0,0,0,0.35), 0px 12px 28px rgba(0,0,0,0.35), inset 0px 1px 0px rgba(255,255,255,0.08)',
    raised: '0px 2px 4px rgba(0,0,0,0.4), 0px 18px 40px rgba(0,0,0,0.45), inset 0px 1px 0px rgba(255,255,255,0.10)',
    button: '0px 10px 22px -8px rgba(0,0,0,0.6), inset 0px 1px 0px rgba(255,255,255,0.22)',
    pressed: '0px 1px 2px rgba(0,0,0,0.35), inset 0px 1px 0px rgba(255,255,255,0.06)',
  },
};

export const lightTheme: AppTheme = {
  mode: 'light',

  background: '#EEF1F6',
  backgroundGradient: ['#F8FAFD', '#F0F3F8', '#E7EDF5'] as const,
  backdropOverlay: 'rgba(244,247,251,0.6)',

  // Cards are solid white now; depth comes from `elevation`, not blur.
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassBorder: 'rgba(15,31,61,0.06)',
  glassHighlight: '#FFFFFF',
  blurTint: 'light',
  blurIntensity: 55,

  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surfaceMuted: '#F1F4F9',
  border: 'rgba(15,31,61,0.09)',
  divider: 'rgba(15,31,61,0.07)',

  text: palette.navy900,
  textSecondary: '#4A5A75',
  textTertiary: '#8693A8',
  textInverse: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  primary: palette.navy800,
  primarySoft: palette.blue100,
  primaryGradient: [palette.navy600, palette.navy950] as const,
  onPrimary: '#FFFFFF',

  nutrition: '#E2634C',
  nutritionSoft: '#FCE9E5',
  hydration: '#3B7DDD',
  hydrationSoft: '#E2EDFB',
  streak: '#DD8A0E',
  streakSoft: '#FDF1DD',
  sleep: '#6E56DB',
  sleepSoft: '#ECE8FB',

  danger: '#D9434A',
  dangerSoft: '#FBE6E7',
  success: '#1E9E6A',
  warning: '#DD8A0E',

  shadowColor: palette.navy900,
  glowColor: palette.navy600,
  skeleton: 'rgba(15,31,61,0.07)',
  inputBackground: '#F4F7FB',
  inputBorder: 'rgba(15,31,61,0.08)',
  inputPlaceholder: '#9AA6B8',
  tabBarBackground: '#FFFFFF',
  tabBarInactive: '#8A97AC',

  elevation: {
    card: '0px 1px 2px rgba(15,31,61,0.05), 0px 10px 24px -6px rgba(15,31,61,0.12), inset 0px 1px 0px rgba(255,255,255,1)',
    raised: '0px 2px 4px rgba(15,31,61,0.06), 0px 22px 44px -12px rgba(15,31,61,0.26), inset 0px 1px 0px rgba(255,255,255,0.14)',
    button: '0px 12px 22px -8px rgba(10,22,48,0.55), inset 0px 1px 0px rgba(255,255,255,0.20), inset 0px -2px 0px rgba(0,0,0,0.18)',
    pressed: '0px 1px 2px rgba(15,31,61,0.08), inset 0px 1px 0px rgba(255,255,255,0.6)',
  },
};

/**
 * The deep-navy surface used for hero panels (like "Today's Progress").
 * Wrapping content in it with `ThemeScope` turns every text, badge and
 * ring inside light-on-navy without each screen choosing colours.
 */
export const heroTheme: AppTheme = {
  ...darkTheme,
  background: palette.navy900,
  glass: 'rgba(255,255,255,0.08)',
  glassStrong: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.08)',
  surfaceMuted: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textSecondary: '#C9D6EE',
  textTertiary: '#93A6C9',
  primary: palette.blue300,
  primarySoft: 'rgba(169,195,240,0.18)',
  primaryGradient: [palette.blue200, palette.blue400] as const,
  onPrimary: palette.navy950,
  nutrition: '#FF9A85',
  nutritionSoft: 'rgba(255,154,133,0.18)',
  hydration: '#7CC4FF',
  hydrationSoft: 'rgba(124,196,255,0.18)',
  success: '#5FD7A4',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  pill: 999,
} as const;

/**
 * Type scale.
 *
 *   Main heading     24   h1          hero titles over cover images
 *   Screen title     22   h2          ScreenHeader
 *   Section heading  18   h3          SectionHeader
 *   Card title       16   h4          titles inside a card
 *   Body text        14   body
 *   Secondary text   12   small
 *   Caption          11   caption     labels, metadata
 *   Button text      16   see Button
 *
 * `display` and the `numeric` sizes sit outside the scale on purpose: the
 * first is the one-off login hero, the others are stat figures meant to
 * dominate their card rather than read as headings.
 */
export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '800' as const, letterSpacing: -1.1 },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.2 },
  h4: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  small: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const, letterSpacing: 0.3 },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  numeric: { fontSize: 28, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
  numericLarge: { fontSize: 44, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -1.5 },
} as const;

/** Soft, wide, navy-tinted shadows (iOS-style props; see theme.elevation). */
export const shadows = {
  none: {},
  sm: {
    shadowColor: '#0F1F3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F1F3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 22,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0F1F3D',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 10,
  }),
} as const;

/** Category colours, keyed by the slug the API returns. */
export const categoryColors: Record<string, string> = {
  chest: '#34D399',
  back: '#60A5FA',
  shoulders: '#FBBF24',
  biceps: '#F472B6',
  triceps: '#A78BFA',
  legs: '#FB923C',
  abs: '#2DD4BF',
  cardio: '#F87171',
  'full-body': '#818CF8',
  mobility: '#94A3B8',
};
