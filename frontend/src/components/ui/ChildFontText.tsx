import React, { forwardRef } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  TextInputProps,
  TextProps,
} from 'react-native';

const resolveChildFont = (style: TextProps['style']): string => {
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight;
  const numericWeight =
    typeof weight === 'number'
      ? weight
      : weight === 'bold'
      ? 700
      : Number(weight) || 400;

  if (numericWeight >= 700) return 'FredokaBold';
  if (numericWeight >= 600) return 'FredokaSemiBold';
  return 'FredokaRegular';
};

export const ChildFontText = forwardRef<
  React.ElementRef<typeof NativeText>,
  TextProps
>(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[style, { fontFamily: resolveChildFont(style) }]} />
));

ChildFontText.displayName = 'ChildFontText';

export const ChildFontTextInput = forwardRef<
  React.ElementRef<typeof NativeTextInput>,
  TextInputProps
>(({ style, ...props }, ref) => (
  <NativeTextInput
    ref={ref}
    {...props}
    style={[style, { fontFamily: resolveChildFont(style) }]}
  />
));

ChildFontTextInput.displayName = 'ChildFontTextInput';
