// src/theme/typography.ts

import { TextStyle } from 'react-native';
import { Colors } from './colors';

/**
 * KiddoTube type scale: Fredoka for display text and Nunito for body copy.
 */

export const Typography: Record<string, TextStyle> = {
  displayLarge: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'Fredoka',
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.kidsTextPrimary,
  },
  headlineLarge: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: 'Fredoka',
    fontWeight: '700',
    letterSpacing: 0,
    color: Colors.kidsTextPrimary,
  },
  headlineMedium: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'Fredoka',
    fontWeight: '600',
    letterSpacing: 0.15,
    color: Colors.kidsTextPrimary,
  },
  titleLarge: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Fredoka',
    fontWeight: '700',
    letterSpacing: 0,
    color: Colors.kidsTextPrimary,
  },
  titleMedium: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Fredoka',
    fontWeight: '700',
    letterSpacing: 0.1,
    color: Colors.kidsTextPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Nunito',
    fontWeight: '700',
    letterSpacing: 0.2,
    color: Colors.kidsTextPrimary,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Nunito',
    fontWeight: '600',
    letterSpacing: 0.2,
    color: Colors.kidsTextSecondary,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Nunito',
    fontWeight: '600',
    letterSpacing: 0.2,
    color: Colors.kidsTextSecondary,
  },
  labelLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Fredoka',
    fontWeight: '700',
    letterSpacing: 0.1,
    color: Colors.kidsTextPrimary,
  },
  labelMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Nunito',
    fontWeight: '700',
    letterSpacing: 0.2,
    color: Colors.kidsTextSecondary,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Nunito',
    fontWeight: '700',
    letterSpacing: 0.3,
    color: Colors.kidsTextMuted,
  },
} as const;

export type TypographyKey = keyof typeof Typography;