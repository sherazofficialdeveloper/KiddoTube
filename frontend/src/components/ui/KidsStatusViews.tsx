// src/components/ui/KidsStatusViews.tsx
import { ChildFontText as Text } from './ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';

/**
 * KidsStatusViews
 * Migrated 1:1 from Kotlin KidsStatusViews.kt
 * 
 * Contains: Loading, Empty, Error states, TimeRemainingPill
 */

// --- KidsLoadingState ---
interface KidsLoadingStateProps {
  message?: string;
}

export const KidsLoadingState: React.FC<KidsLoadingStateProps> = ({
  message = 'Finding fun videos for you...',
}) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size="large"
        color={Colors.kidsPrimary}
        style={styles.loadingIndicator}
      />
      <Text style={[Typography.titleMedium, styles.loadingText]}>
        {message}
      </Text>
    </View>
  );
};

// --- KidsEmptyState ---
interface KidsEmptyStateProps {
  title?: string;
  subtitle?: string;
}

export const KidsEmptyState: React.FC<KidsEmptyStateProps> = ({
  title = 'No Approved Videos Yet',
  subtitle = 'There are no videos to watch right now. Check back soon!',
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <MaterialIcons name="tv-off" size={52} color={Colors.kidsSkyBlue} />
      </View>

      <Text style={[Typography.headlineMedium, styles.emptyTitle]}>
        {title}
      </Text>

      <Text style={[Typography.bodyLarge, styles.emptySubtitle]}>
        {subtitle}
      </Text>

    </View>
  );
};

// --- KidsErrorState ---
interface KidsErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const KidsErrorState: React.FC<KidsErrorStateProps> = ({
  message = "Oops! We couldn't connect right now.",
  onRetry,
}) => {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconCircle}>
        <MaterialIcons
          name="sentiment-dissatisfied"
          size={44}
          color={Colors.kidsSunnyYellow}
        />
      </View>

      <Text style={[Typography.headlineMedium, styles.errorTitle]}>
        Connection Glitch
      </Text>

      <Text style={[Typography.bodyLarge, styles.errorSubtitle]}>
        {message}
      </Text>

      <TouchableOpacity
        style={styles.errorButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <MaterialIcons name="refresh" size={20} color={Colors.kidsOnPrimary} />
        <Text style={styles.errorButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- TimeRemainingPill ---
interface TimeRemainingPillProps {
  remainingMinutes: number;
}

export const TimeRemainingPill: React.FC<TimeRemainingPillProps> = ({
  remainingMinutes,
}) => {
  const isLow = remainingMinutes <= 10;
  const tint = isLow ? Colors.kidsPrimary : Colors.kidsTextSecondary;

  return (
    <View style={styles.pillContainer} testID="time_remaining_indicator">
      <MaterialIcons name="hourglass-top" size={14} color={tint} />
      <Text style={[styles.pillText, { color: tint }]}>
        {remainingMinutes} min left
      </Text>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Dimensions.spaceLarge,
  },
  loadingIndicator: {
    marginBottom: Dimensions.spaceMedium,
  },
  loadingText: {
    color: Colors.kidsTextSecondary,
    textAlign: 'center',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Dimensions.spaceLarge,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.kidsSkyBlue + '26', // 15% alpha
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Dimensions.spaceLarge,
  },
  emptyTitle: {
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
    marginBottom: Dimensions.spaceSmall,
  },
  emptySubtitle: {
    color: Colors.kidsTextSecondary,
    textAlign: 'center',
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Dimensions.spaceLarge,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.kidsSunnyYellow + '33', // 20% alpha
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Dimensions.spaceMedium,
  },
  errorTitle: {
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
    marginBottom: Dimensions.spaceSmall,
  },
  errorSubtitle: {
    color: Colors.kidsTextSecondary,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: Dimensions.spaceLarge,
    backgroundColor: Colors.kidsSkyBlue,
    paddingHorizontal: 24,
    height: Dimensions.touchTargetMin,
    borderRadius: Dimensions.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  errorButtonText: {
    ...Typography.labelLarge,
    color: Colors.kidsOnPrimary,
    marginLeft: 8,
  },

  // Time Remaining Pill
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Dimensions.radiusPill,
    backgroundColor: Colors.kidsSurfaceVariant,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});