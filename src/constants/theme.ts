import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Responsive scale helpers ──────────────────────────────────────────────
// Base design is iPhone 15 Pro Max  (430 × 932 pt)
const BASE_W = 430;
const BASE_H = 932;

/** Scale a width-relative value */
export const rw = (px: number) => (SCREEN_W / BASE_W) * px;
/** Scale a height-relative value */
export const rh = (px: number) => (SCREEN_H / BASE_H) * px;
/** Scale a font size */
export const rf = (px: number) => Math.round((SCREEN_W / BASE_W) * px);

export const SCREEN = { W: SCREEN_W, H: SCREEN_H };

// ─── Colours ───────────────────────────────────────────────────────────────
// Light palette. `Colors` stays as the existing export so legacy imports keep
// working; `lightColors` is an alias used by the theme system.
export const Colors = {
  // Backgrounds
  bg: '#F5F0FF',          // light lavender — all screens
  bgDark: '#1E1333',      // splash dark bg
  bgDarkDeep: '#160D28',  // splash darkest
  surface: '#FFFFFF',     // cards, bottom sheet
  surfaceTint: '#EDE9FE', // permission checklist box, stat chips
  border: '#E5E7EB',

  // Brand purple gradient stops
  purple1: '#A78BFA',     // lighter
  purple2: '#8B5CF6',     // mid
  purple3: '#7C3AED',     // deep

  // Semantic
  keep: '#22C55E',
  keepBg: '#DCFCE7',
  delete: '#EF4444',
  deleteBg: '#FEE2E2',
  accent: '#8B5CF6',      // general purple

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textWhite: '#FFFFFF',
  textPurple: '#7C3AED',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlayKeep: 'rgba(34,197,94,0.88)',
  overlayDelete: 'rgba(239,68,68,0.88)',
  shadow: 'rgba(124,58,237,0.15)',
} as const;

export const lightColors = Colors;

// Dark palette — same key structure as `lightColors`, so screens can swap
// between them by a single `useTheme()` call. Brand purples + semantic
// keep/delete primaries stay the same so the app's identity is preserved
// across modes; backgrounds, surfaces, borders, and text tones flip.
export const darkColors: typeof Colors = {
  // Backgrounds — purple-tinted dark, matching the splash palette
  bg: '#0F0820',
  bgDark: '#1E1333',
  bgDarkDeep: '#160D28',
  surface: '#1E1333',
  surfaceTint: '#2A1F45',
  border: '#2D2541',

  // Brand purples unchanged
  purple1: '#A78BFA',
  purple2: '#8B5CF6',
  purple3: '#7C3AED',

  // Semantic — primaries unchanged; tinted backgrounds darken so they don't
  // glow against the dark surface.
  keep: '#22C55E',
  keepBg: '#0F2E1F',
  delete: '#EF4444',
  deleteBg: '#3D0F0F',
  accent: '#8B5CF6',

  // Text — inverted tonal scale; subtle purple cast keeps brand feel.
  textPrimary: '#F5F0FF',
  textSecondary: '#A89BC2',
  textMuted: '#6B5A8A',
  textWhite: '#FFFFFF',
  textPurple: '#A78BFA',  // brighter on dark surfaces

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlayKeep: 'rgba(34,197,94,0.88)',
  overlayDelete: 'rgba(239,68,68,0.88)',
  shadow: 'rgba(0,0,0,0.45)',
} as const;

export type ThemePalette = typeof Colors;

// ─── Gradients (pass to LinearGradient colors prop) ───────────────────────
export const Gradients = {
  purple: ['#A78BFA', '#7C3AED'] as const,
  purpleDark: ['#8B5CF6', '#6D28D9'] as const,
  hero: ['#9D72FF', '#7C3AED'] as const,        // storage freed hero card
  splashBg: ['#1E1333', '#160D28'] as const,
} as const;

// ─── Typography ────────────────────────────────────────────────────────────
export const Font = {
  xs: rf(11),
  sm: rf(13),
  base: rf(15),
  md: rf(17),
  lg: rf(20),
  xl: rf(24),
  '2xl': rf(30),
  '3xl': rf(36),
  '4xl': rf(48),
  '5xl': rf(56),

  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────
export const Space = {
  xxs: rw(2),
  xs: rw(4),
  sm: rw(8),
  md: rw(12),
  base: rw(16),
  lg: rw(20),
  xl: rw(24),
  '2xl': rw(32),
  '3xl': rw(40),
  '4xl': rw(48),
  '5xl': rw(64),
} as const;

// ─── Border radius ─────────────────────────────────────────────────────────
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ─── Swipe Card ────────────────────────────────────────────────────────────
export const Card = {
  width: rw(370),
  height: rh(480),
  radius: Radius.xl,
  swipeThreshold: SCREEN_W * 0.28,
  rotationFactor: 12, // degrees
} as const;

// ─── Bottom Tab Bar ────────────────────────────────────────────────────────
export const TAB_BAR_HEIGHT = rh(84);
