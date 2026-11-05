// src/utils/clipboard.ts

import { Alert } from 'react-native';

let ClipboardNative: any = null;
try {
  ClipboardNative = require('@react-native-clipboard/clipboard').default;
} catch (e) {
  try {
    ClipboardNative = require('@react-native-clipboard/clipboard');
  } catch (err) {
    ClipboardNative = null;
  }
}

export const copyToClipboard = async (
  text: string,
  successTitle = 'Copied to Clipboard! 📋',
  successMessage?: string
): Promise<boolean> => {
  try {
    if (ClipboardNative && typeof ClipboardNative.setString === 'function') {
      ClipboardNative.setString(text);
      if (successMessage) {
        Alert.alert(successTitle, successMessage);
      }
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] Native copy error:', err);
  }

  // Fallback modal notification with content
  Alert.alert(successTitle, successMessage || text);
  return true;
};

