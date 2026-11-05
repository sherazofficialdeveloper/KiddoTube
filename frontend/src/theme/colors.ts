// src/theme/colors.ts

/**
 * KidsStream & KiddoTube Color Tokens
 * Supports Dynamic Theme Modes (Light & Dark Mode)
 * Matching the Official Prototype Specifications
 */

export const Colors = {
  // KiddoTube brand palette for the Flying Sun app icon.
  // Primary Reference Palette:
  kiddoYellow: '#FFC93C',             // Sunny Yellow (Flying Sun / Emblem)
  kiddoBlue: '#0284C7',               // Sky Blue (App Icon Badge / Highlights)
  kiddoCoral: '#E52E2E',              // Pure Red (Playful Accents / Buttons / Logo Tube)
  kiddoWhite: '#FFFFFF',              // Pure White
  kiddoDarkNavy: '#000000',           // Jet Black
  kiddoNavy: '#0F172A',               // Slate 900

  // Alternative Palette 1 (Playful Lagoon):
  kiddoAlt1Amber: '#FFB703',
  kiddoAlt1Ocean: '#0284C7',
  kiddoAlt1Tangerine: '#E52E2E',
  kiddoAlt1Surface: '#F8FAFC',

  // Alternative Palette 2 (Cozy Sunset):
  kiddoAlt2Sunshine: '#FDE047',
  kiddoAlt2Azure: '#0284C7',
  kiddoAlt2Sunset: '#E52E2E',
  kiddoAlt2Surface: '#FFFBEB',

  // Core Brand Colors (KiddoTube Concept 3 Logo Palette)
  kidsPrimary: '#E52E2E',              // Pure Red (from logo button/accents)
  kidsPrimaryDark: '#DC2626',
  kidsPrimaryContainer: '#FFEBE8',
  kidsOnPrimary: '#FFFFFF',

  // Category & Accent Colors (Strictly Logo Palette)
  kidsSkyBlue: '#3A9BE8',              // Sky Blue (from logo icon)
  kidsSkyBlueContainer: '#E1F3FE',
  kidsSunnyYellow: '#FFC93C',          // Sunny Yellow (from logo emblem)
  kidsSunnyYellowContainer: '#FFF8E6',
  kidsCoral: '#FF6F61',                // Coral Red (from logo)
  kidsCoralContainer: '#FFEBE8',

  // Compatibility Mappings (Enforcing strict Logo Colors)
  kidsMintGreen: '#3A9BE8',            // Mapped to Logo Sky Blue
  kidsMintGreenContainer: '#E1F3FE',
  kidsPlayfulPurple: '#FFC93C',        // Mapped to Logo Sunny Yellow
  kidsPlayfulPurpleContainer: '#FFF8E6',

  // Atmosphere Gradients
  kidsSkyGradientTop: '#E1F3FE',
  kidsSkyGradientBottom: '#FFFFFF',

  // Profile Selection Screen Palette (from logo colors)
  kidsProfileRed: '#FF6F61',
  kidsProfileDarkRed: '#E85B4E',
  kidsProfileTeal: '#3A9BE8',

  // Category Chip Tokens
  kidsActiveChipBg: '#1E293B',
  kidsActiveChipText: '#FFFFFF',
  kidsInactiveChipBg: '#FFFFFF',
  kidsInactiveChipBorder: '#E2E8F0',

  // Surfaces & Cards (Light default)
  kidsBackground: '#FFF9EC',           // Prototype --bg: #FFF9EC (warm sunny soft cream)
  kidsSurface: '#FFFFFF',              // Prototype --card: #fff
  kidsSurfaceVariant: '#F7F1E4',       // Soft warm cream container
  kidsCardBorder: '#EADFC8',           // Prototype --line: #eadfc8

  // Typography Colors (Light default)
  kidsTextPrimary: '#23324A',          // Prototype --ink: #23324a
  kidsTextSecondary: '#5F6E85',        // Prototype --mute: #5f6e85
  kidsTextMuted: '#8C9EAE',            // Muted label

  // Night/Timeout Calm Palette
  timeoutNightBackground: '#14203A',   // Prototype Bedtime background: #14203a
  timeoutNightSurface: '#1D2433',      // Prototype Dark background: #1d2433
  timeoutMoonGlow: '#FFC93C',
  timeoutNightText: '#F4F1E8',         // Prototype --ink in dark: #f4f1e8
  timeoutNightMuted: '#B4BFD2',        // Prototype --mute in dark: #b4bfd2

  // Status & Controls (Strictly Logo Palette)
  kidsSuccess: '#3A9BE8',              // Logo Sky Blue
  kidsWarning: '#FFC93C',              // Logo Sunny Yellow
  kidsError: '#FF6F61',                // Logo Coral
  kidsLockAccent: '#1E293B',
} as const;

/**
 * Prototype-accurate Light Theme Palette
 */
export const LightPalette = {
  ...Colors,
  isDark: false,
  background: '#FFF9EC',               // Prototype: --bg: #FFF9EC
  card: '#FFFFFF',                     // Prototype: --card: #fff
  cardBorder: '#EADFC8',               // Prototype: --line: #eadfc8
  textPrimary: '#23324A',              // Prototype: --ink: #23324a
  textSecondary: '#5F6E85',            // Prototype: --mute: #5f6e85
  textMuted: '#8C9EAE',
  parentBg: '#EAF4FD',                 // Prototype: --pbg: #EAF4FD
  chipBg: '#FFFFFF',
  chipBorder: '#EADFC8',
  chipActiveBg: '#FFC93C',
  chipActiveText: '#23324A',
  topBarBg: '#FFC93C',
  bottomNavBg: '#FFFFFF',
  bottomNavBorder: '#EADFC8',
  bottomNavActive: '#3A9BE8',
  bottomNavInactive: '#5F6E85',
};

/**
 * Prototype-accurate Dark Theme Palette
 */
export const DarkPalette = {
  ...Colors,
  isDark: true,
  kidsBackground: '#1D2433',           // Prototype: :root[data-theme=dark] --bg: #1d2433
  kidsSurface: '#2A3348',              // Prototype: --card: #2a3348
  kidsSurfaceVariant: '#242C3F',
  kidsCardBorder: '#3D4862',           // Prototype: --line: #3d4862
  kidsTextPrimary: '#F4F1E8',          // Prototype: --ink: #f4f1e8
  kidsTextSecondary: '#B4BFD2',        // Prototype: --mute: #b4bfd2
  kidsTextMuted: '#7E8B9F',
  background: '#1D2433',
  card: '#2A3348',
  cardBorder: '#3D4862',
  textPrimary: '#F4F1E8',
  textSecondary: '#B4BFD2',
  textMuted: '#7E8B9F',
  parentBg: '#16202F',                 // Prototype: --pbg: #16202f
  chipBg: '#2A3348',
  chipBorder: '#3D4862',
  chipActiveBg: '#FFC93C',
  chipActiveText: '#1D2433',
  topBarBg: '#1D2433',
  bottomNavBg: '#2A3348',
  bottomNavBorder: '#3D4862',
  bottomNavActive: '#3A9BE8',
  bottomNavInactive: '#B4BFD2',
};

export type ThemePalette = {
  [K in keyof typeof LightPalette]: (typeof LightPalette)[K] extends boolean ? boolean : string;
};

export const getAppColors = (isDark: boolean): ThemePalette => (isDark ? DarkPalette : LightPalette);

export type ColorKey = keyof typeof Colors;