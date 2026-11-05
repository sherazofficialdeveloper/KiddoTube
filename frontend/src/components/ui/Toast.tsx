// src/components/ui/Toast.tsx
import { ChildFontText as Text } from './ChildFontText';

import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Toast
 * Migrated from Kotlin KidsAppRoot.kt AnimatedVisibility toast
 * 
 * Slides in from top, auto-dismisses after 3.5 seconds
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  text: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3500,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });

    // Auto-dismiss
    const timer = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Type-specific styling
  const { backgroundColor, iconName } = getToastStyle(type);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 12 },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor }]}
        activeOpacity={0.9}
        onPress={onDismiss}
      >
        <MaterialIcons
          name={iconName}
          size={20}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text style={styles.text} numberOfLines={3}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

function getToastStyle(type: ToastType): {
  backgroundColor: string;
  iconName: MaterialIconsIconName;
} {
  switch (type) {
    case 'success':
      return {
        backgroundColor: '#007A87', // matches Kotlin KidsAppRoot toast
        iconName: 'check-circle',
      };
    case 'error':
      return {
        backgroundColor: Colors.kidsError,
        iconName: 'error-outline',
      };
    case 'info':
    default:
      return {
        backgroundColor: Colors.kidsSkyBlue,
        iconName: 'info-outline',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
});