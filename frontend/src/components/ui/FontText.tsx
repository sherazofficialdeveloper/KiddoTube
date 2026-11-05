import React, { forwardRef } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  TextInputProps,
  TextProps,
} from 'react-native';

const resolveFontFamily = (style: TextProps['style']): string => {
  const flattenedStyle = StyleSheet.flatten(style);
  const weight = flattenedStyle?.fontWeight;
  const isBold =
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900' ||
    (typeof weight === 'string' && Number(weight) >= 700) ||
    (typeof weight === 'number' && weight >= 700);

  const family = flattenedStyle?.fontFamily;
  const resolveNunitoWeight = (): string => {
    if (typeof weight === 'string' && Number(weight) >= 800) {
      return 'NunitoExtraBold';
    }
    if (typeof weight === 'number' && weight >= 800) {
      return 'NunitoExtraBold';
    }
    if (isBold) return 'NunitoBold';
    if (
      (typeof weight === 'string' && Number(weight) >= 600) ||
      (typeof weight === 'number' && weight >= 600)
    ) {
      return 'NunitoSemiBold';
    }
    return 'NunitoRegular';
  };

  if (family === 'FredokaBold' || family === 'Fredoka-Bold') {
    return 'FredokaBold';
  }

  if (
    family === 'Fredoka' ||
    family === 'Fredoka-SemiBold' ||
    family === 'Fredoka_bold'
  ) {
    if (isBold) return 'FredokaBold';
    if (
      (typeof weight === 'string' && Number(weight) >= 600) ||
      (typeof weight === 'number' && weight >= 600)
    ) {
      return 'FredokaSemiBold';
    }
    return 'FredokaRegular';
  }

  if (family === 'Nunito-Bold') {
    return typeof weight === 'string' && Number(weight) >= 800
      ? 'NunitoExtraBold'
      : typeof weight === 'number' && weight >= 800
      ? 'NunitoExtraBold'
      : 'NunitoBold';
  }

  if (family === 'Nunito' || family === 'Nunito_bold') {
    return resolveNunitoWeight();
  }

  if (!family) {
    if (flattenedStyle?.fontSize && flattenedStyle.fontSize >= 18 && isBold) {
      return 'FredokaBold';
    }
    return resolveNunitoWeight();
  }

  return family;
};

export const FontText = forwardRef<React.ElementRef<typeof NativeText>, TextProps>(
  ({ style, ...props }, ref) => {
    const fontFamily = resolveFontFamily(style);
    return (
      <NativeText
        ref={ref}
        {...props}
        style={[style, { fontFamily }]}
      />
    );
  }
);

FontText.displayName = 'FontText';

export const FontTextInput = forwardRef<
  React.ElementRef<typeof NativeTextInput>,
  TextInputProps
>(
  ({ style, ...props }, ref) => {
    const fontFamily = resolveFontFamily(style);
    return (
      <NativeTextInput
        ref={ref}
        {...props}
        style={[style, { fontFamily }]}
      />
    );
  }
);

FontTextInput.displayName = 'FontTextInput';
