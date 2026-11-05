// src/features/parent-dashboard/ParentDashboardView.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { ParentNavSection } from '../../types/navigation';
import type { ParentDashboardDataDto } from '../../types/api';

/**
 * ParentDashboardView
 * Migrated from Kotlin ParentPanelScreen.kt → ParentDashboardView
 */

interface ParentDashboardViewProps {
  dashboardData: ParentDashboardDataDto | null;
  childrenCount: number;
  onNavigate: (section: ParentNavSection) => void;
  onRefresh: () => void;
}

export const ParentDashboardView: React.FC<ParentDashboardViewProps> = ({
  dashboardData,
  childrenCount,
  onNavigate,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const stats = dashboardData?.stats;
  const dailyLimit = stats?.dailyLimitMinutes ?? 60;
  const watched = stats?.todayTotalWatchedMinutes ?? 0;
  const videosCount = stats?.totalApprovedVideos ?? 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      decelerationRate={0.92}
    >
      {/* Family card */}
      <View style={styles.familyCard}>
        <View style={styles.familyHeader}>
          <View>
            <Text style={styles.familyLabel}>Family Account</Text>
            <Text style={styles.familyName}>
              {dashboardData?.parent?.displayName ?? 'Parent'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            accessibilityLabel="Refresh family data"
            disabled={isRefreshing}
          >
            <MaterialIcons
              name="refresh"
              size={24}
              color="#38BDF8"
              style={isRefreshing ? { opacity: 0.5 } : undefined}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <MetricBox label="Children" value={`${childrenCount}`} />
          <MetricBox label="Daily Limit" value={`${dailyLimit}m`} />
          <MetricBox label="Today Used" value={`${watched}m`} />
        </View>
      </View>

      <Text style={styles.sectionHeader}>Parent Controls</Text>

      <View style={styles.row}>
        <QuickActionCard
          title="Manage Children"
          subtitle="Add, edit, credentials"
          icon="manage-accounts"
          color={Colors.kidsSkyBlue}
          onPress={() => onNavigate(ParentNavSection.CHILDREN)}
        />
        <QuickActionCard
          title="Approved Media"
          subtitle={`${videosCount} videos approved`}
          icon="video-library"
          color={Colors.kidsCoral}
          onPress={() => onNavigate(ParentNavSection.CONTENT)}
        />
      </View>

      <View style={styles.row}>
        <QuickActionCard
          title="Daily Limit"
          subtitle="Applies to all kids"
          icon="timer"
          color={Colors.kidsSunnyYellow}
          onPress={() => onNavigate(ParentNavSection.SCREEN_TIME)}
        />
        <QuickActionCard
          title="Parent PIN"
          subtitle="Update security PIN"
          icon="key"
          color={Colors.kidsSkyBlue}
          onPress={() => onNavigate(ParentNavSection.PIN)}
        />
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <MaterialIcons name="shield" size={24} color={Colors.kidsSkyBlue} />
        <Text style={styles.infoText}>
          All controls synchronize live with our central Node.js backend.
          Children only have access to parent-approved content.
        </Text>
      </View>
    </ScrollView>
  );
};

// --- MetricBox ---
interface MetricBoxProps {
  label: string;
  value: string;
}
const MetricBox: React.FC<MetricBoxProps> = ({ label, value }) => (
  <View style={styles.metricBox}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

// --- QuickActionCard ---
interface QuickActionCardProps {
  title: string;
  subtitle: string;
  icon: MaterialIconsIconName;
  color: string;
  onPress: () => void;
}
const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  subtitle,
  icon,
  color,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.quickCard}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View
      style={[styles.quickIcon, { backgroundColor: color + '1F' }]}
    >
      <MaterialIcons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.quickTitle}>{title}</Text>
    <Text style={styles.quickSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  familyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyLabel: {
    ...Typography.labelMedium,
    color: '#94A3B8',
  },
  familyName: {
    ...Typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    ...Typography.titleMedium,
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    fontWeight: '900',
    fontSize: 16,
    color: '#000000',
  },
  quickSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: '#1E3A8A',
    marginLeft: 10,
  },
});