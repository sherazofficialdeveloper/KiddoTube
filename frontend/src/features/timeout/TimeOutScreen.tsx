// src/features/timeout/TimeOutScreen.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';

/**
 * TimeOutScreen
 * Migrated 1:1 from Kotlin TimeOutScreen.kt
 * 
 * - Night gradient background
 * - Glowing moon emblem
 * - "Time's up!" message
 * - "Timer stopped" badge
 * - Bottom-right settings button for parent PIN access
 */

interface TimeOutScreenProps {
  onProtectedSettingsClick: () => void;
}

export const TimeOutScreen: React.FC<TimeOutScreenProps> = ({
  onProtectedSettingsClick,
}) => {
  return (
    <LinearGradient
      colors={[
        Colors.timeoutNightBackground,
        '#131D38',
        Colors.timeoutNightBackground,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <View style={styles.centerContent} testID="time_out_screen">
        {/* Moon emblem */}
        <View style={styles.moonWrap}>
          <MaterialIcons
            name="bedtime"
            size={72}
            color={Colors.timeoutMoonGlow}
          />
        </View>

        <Text style={styles.title}>Time's up!</Text>

        <Text style={styles.subtitle}>
          Your watch time for today{'\n'}has ended.
        </Text>

        <View style={styles.tomorrowPill}>
          <Text style={styles.tomorrowText}>
            🌟 See you tomorrow! 🌟
          </Text>
        </View>

        {/* Timer stopped badge */}
        <View style={styles.timerStoppedBadge}>
          <View style={styles.timerCircle}>
            <MaterialIcons name="timer" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.timerStoppedText}>Timer stopped</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={onProtectedSettingsClick}
        accessibilityRole="button"
        accessibilityLabel="Parent settings"
        testID="timeout_protected_settings_lock"
      >
        <View style={styles.lockCircle}>
          <MaterialIcons name="settings" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Dimensions.spaceLarge,
  },
  moonWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.timeoutNightSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.timeoutNightText,
    textAlign: 'center',
    marginTop: Dimensions.spaceLarge,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.timeoutNightMuted,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: Dimensions.spaceSmall,
  },
  tomorrowPill: {
    backgroundColor: Colors.timeoutNightSurface + 'D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Dimensions.radiusPill,
    marginTop: 18,
  },
  tomorrowText: {
    ...Typography.titleMedium,
    color: Colors.timeoutMoonGlow,
    fontWeight: '700',
  },
  timerStoppedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007A87',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  timerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStoppedText: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 12,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
    width: Dimensions.touchTargetMin,
    height: Dimensions.touchTargetMin,
    justifyContent: 'center',
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});