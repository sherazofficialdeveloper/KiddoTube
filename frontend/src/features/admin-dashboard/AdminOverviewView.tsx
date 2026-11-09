// src/features/admin-dashboard/AdminOverviewView.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { AdminSection } from '../../types/navigation';
import type { AdminStatsDto } from '../../types/api';

/**
 * AdminOverviewView
 * Clean light UI with official KiddoTube logo colors (Red, Amber, Royal Blue, White)
 * 
 * System health + stats grid + interactive card navigation to Parents & Children
 */

interface AdminOverviewViewProps {
  stats: AdminStatsDto | null;
  onRefresh: () => void;
  onNavigateSection?: (section: AdminSection, subTab?: 'video' | 'channel' | 'playlist') => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  stats,
  onRefresh,
  onNavigateSection,
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const s: AdminStatsDto =
    stats ?? {
      totalParents: 0,
      activeParents: 0,
      disabledParents: 0,
      totalChildren: 0,
      activeChildren: 0,
      disabledChildren: 0,
      totalChannels: 0,
      totalPlaylists: 0,
      totalVideos: 0,
      systemStatus: 'ONLINE',
      uptimeSeconds: 0,
      nodeVersion: '—',
      databaseType: '—',
    };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      decelerationRate={0.92}
    >
      {/* System health card - Clean Light Branded */}
      <View style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <View style={styles.healthStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              BACKEND {s.systemStatus}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            accessibilityLabel="Refresh status"
            disabled={isRefreshing}
          >
            <MaterialIcons
              name="refresh"
              size={24}
              color="#0284C7"
              style={isRefreshing ? { opacity: 0.5 } : undefined}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.healthTitle}>
          Central Platform Governance
        </Text>
        <Text style={styles.healthMeta}>
          Node.js Engine {s.nodeVersion} • Database: {s.databaseType}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Platform Community & Content Statistics
      </Text>

      {/* Hero Stat: Total Users */}
      <View style={{ marginBottom: 12 }}>
        <StatCard
          title="Total Users"
          count={`${s.totalUsers ?? (s.totalParents + s.totalChildren)}`}
          sub={`${s.totalParents} parents • ${s.totalChildren} child explorers registered`}
          color="#059669"
          borderColor="#A7F3D0"
          icon="groups"
        />
      </View>

      {/* Row 1: Parents & Children (Clickable to manage users) */}
      <View style={styles.row}>
        <StatCard
          title="Total Parents"
          count={`${s.totalParents}`}
          sub={`${s.activeParents} active • ${s.disabledParents} disabled`}
          color="#0284C7"
          borderColor="#BAE6FD"
          icon="manage-accounts"
          onPress={() => onNavigateSection?.(AdminSection.PARENTS)}
        />
        <StatCard
          title="Total Children"
          count={`${s.totalChildren}`}
          sub={`${s.activeChildren} active • ${s.disabledChildren} disabled`}
          color="#E52E2E"
          borderColor="#FECACA"
          icon="people"
          onPress={() => onNavigateSection?.(AdminSection.CHILDREN)}
        />
      </View>

      {/* Row 2: Videos & Channels */}
      <View style={styles.row}>
        <StatCard
          title="Approved Videos"
          count={`${s.totalVideos}`}
          sub="Filtered YouTube whitelist"
          color="#D97706"
          borderColor="#FDE68A"
          icon="video-library"
          onPress={() => onNavigateSection?.(AdminSection.CONTENT, 'video')}
        />
        <StatCard
          title="Approved Channels"
          count={`${s.totalChannels}`}
          sub="Curated safe creator hubs"
          color="#7C3AED"
          borderColor="#DDD6FE"
          icon="subscriptions"
          onPress={() => onNavigateSection?.(AdminSection.CONTENT, 'channel')}
        />
      </View>

      {/* Security audit card - Clean Light Branded */}
      <View style={styles.auditCard}>
        <View style={styles.auditHeader}>
          <MaterialIcons name="verified-user" size={24} color="#059669" />
          <Text style={styles.auditTitle}>
            Zero-Trust Child Protection Verification
          </Text>
        </View>
        <Text style={styles.auditBody}>
          • Role-Based Access: CHILD, PARENT, ADMIN enforced at HTTP middleware level.{'\n'}
          • Passwords & PINs securely hashed; no unauthorized plaintext leaks.{'\n'}
          • Instant account controls: Activate, Deactivate, or Block users with immediate session invalidation.
        </Text>
      </View>
    </ScrollView>
  );
};

// --- StatCard ---
interface StatCardProps {
  title: string;
  count: string;
  sub: string;
  color: string;
  borderColor?: string;
  icon: any;
  onPress?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  sub,
  color,
  borderColor = '#E2E8F0',
  icon,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.statCard, { borderColor }]}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={styles.statTopRow}>
      <Text style={styles.statTitle} numberOfLines={2}>
        {title}
      </Text>
      <View style={[styles.statIconBadge, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
    </View>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statSub}>{sub}</Text>
    <View style={styles.statTapHint}>
      <Text style={[styles.statTapHintText, { color }]}>Manage &gt;</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    borderLeftColor: '#0284C7',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  healthTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
  },
  healthMeta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 14,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  statTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 18,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 34,
    fontWeight: '900',
    marginVertical: 4,
  },
  statSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    lineHeight: 18,
  },
  statTapHint: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  statTapHintText: {
    fontSize: 11,
    fontWeight: '800',
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    borderLeftColor: '#059669',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    overflow: 'hidden',
  },
  auditTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  auditBody: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 22,
  },
});