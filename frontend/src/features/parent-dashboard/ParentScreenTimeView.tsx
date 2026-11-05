// src/features/parent-dashboard/ParentScreenTimeView.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { hexLongToColor } from '../../utils/color';
import type { ChildDetailDto } from '../../types/api';

interface ParentScreenTimeViewProps {
  currentLimit: number;
  children: ChildDetailDto[];
  onSaveDailyLimit: (limit: number) => Promise<void> | void;
  onSaveChildDailyLimit?: (childId: string, limit: number) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

export function formatScreenTimeDisplay(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return hrs === 1 ? '1 hour' : `${hrs} hours`;
  return `${hrs}.${mins < 10 ? '0' : ''}${mins} hour`;
}

export const ParentScreenTimeView: React.FC<ParentScreenTimeViewProps> = ({
  currentLimit,
  children,
  onSaveDailyLimit,
  onSaveChildDailyLimit,
  onRefresh,
}) => {
  const [globalLimit, setGlobalLimit] = useState(currentLimit || 60);
  const [childLimits, setChildLimits] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    children.forEach((c) => {
      init[c.id] = c.dailyLimitMinutes ?? currentLimit ?? 60;
    });
    return init;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state whenever parent data updates
  useEffect(() => {
    setGlobalLimit(currentLimit || 60);
    const init: Record<string, number> = {};
    children.forEach((c) => {
      init[c.id] = c.dailyLimitMinutes ?? currentLimit ?? 60;
    });
    setChildLimits(init);
  }, [currentLimit, children]);

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch {}
    setIsRefreshing(false);
  };

  const handleAdjustGlobal = (delta: number) => {
    setGlobalLimit((prev) => Math.max(0, Math.min(480, prev + delta)));
  };

  const handleAdjustChild = (childId: string, delta: number) => {
    setChildLimits((prev) => {
      const current = prev[childId] ?? globalLimit;
      const next = Math.max(0, Math.min(480, current + delta));
      return { ...prev, [childId]: next };
    });
  };

  const handleSaveGlobal = async () => {
    await onSaveDailyLimit(globalLimit);
    // Real-time update across all child cards immediately
    const updated: Record<string, number> = {};
    children.forEach((c) => {
      updated[c.id] = globalLimit;
    });
    setChildLimits(updated);
    Alert.alert('Screen Time Updated', `Daily limit set to ${formatScreenTimeDisplay(globalLimit)} for all children.`);
  };

  const handleSaveChild = async (child: ChildDetailDto) => {
    const limit = childLimits[child.id] ?? globalLimit;
    if (onSaveChildDailyLimit) {
      await onSaveChildDailyLimit(child.id, limit);
    } else {
      await onSaveDailyLimit(limit);
    }
    Alert.alert('Child Limit Updated', `Daily limit set to ${formatScreenTimeDisplay(limit)} for ${child.displayName || child.username}.`);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      decelerationRate={0.92}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handlePullToRefresh}
          colors={['#0284C7', '#E52E2E']}
          tintColor="#0284C7"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Screen Time Controls</Text>
        <Text style={styles.subtitle}>
          Set healthy viewing limits with 15-minute steppers up to 8 hours.
        </Text>
      </View>

      {/* Global Limit Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="hourglass-bottom" size={24} color="#D97706" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Global Daily Limit</Text>
            <Text style={styles.cardDescription}>
              Apply this limit across all children's accounts.
            </Text>
          </View>
        </View>

        {/* Global 15m Stepper */}
        <View style={styles.stepperWrap}>
          <TouchableOpacity
            style={[styles.stepperBtn, globalLimit <= 0 && styles.stepperBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => handleAdjustGlobal(-15)}
            disabled={globalLimit <= 0}
            accessibilityLabel="Decrease global screen time limit"
          >
            <MaterialIcons name="remove" size={26} color={globalLimit <= 0 ? '#CBD5E1' : '#0F172A'} />
          </TouchableOpacity>

          <View style={styles.stepperDisplay}>
            <Text style={styles.stepperTime}>{formatScreenTimeDisplay(globalLimit)}</Text>
            <Text style={styles.stepperUnit}>per day</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepperBtn, globalLimit >= 480 && styles.stepperBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => handleAdjustGlobal(15)}
            disabled={globalLimit >= 480}
            accessibilityLabel="Increase global screen time limit"
          >
            <MaterialIcons name="add" size={26} color={globalLimit >= 480 ? '#CBD5E1' : '#0F172A'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.saveGlobalBtn}
          activeOpacity={0.85}
          onPress={handleSaveGlobal}
        >
          <MaterialIcons name="check" size={20} color="#FFFFFF" />
          <Text style={styles.saveGlobalBtnText}>Apply to All Children</Text>
        </TouchableOpacity>
      </View>

      {/* Children Section */}
      <Text style={styles.childrenSectionTitle}>
        Children Profiles ({children.length})
      </Text>

      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="child-care" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Children Profiles</Text>
          <Text style={styles.emptySubtitle}>
            Add a child profile to manage individual screen time.
          </Text>
        </View>
      ) : (
        children.map((child) => {
          const limit = childLimits[child.id] ?? globalLimit;
          const watched = child.minutesWatchedToday || 0;

          return (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childHeader}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: hexLongToColor(child.colorHex) },
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{child.avatarEmoji}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.displayName || child.username}</Text>
                  <Text style={styles.childMeta}>
                    Username: {child.username} • Watched: {watched}m today
                  </Text>
                </View>
              </View>

              {/* 15m Stepper for Child */}
              <View style={styles.childStepperWrap}>
                <TouchableOpacity
                  style={[styles.stepperBtnSmall, limit <= 0 && styles.stepperBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={() => handleAdjustChild(child.id, -15)}
                  disabled={limit <= 0}
                  accessibilityLabel={`Decrease screen time for ${child.displayName || child.username}`}
                >
                  <MaterialIcons name="remove" size={22} color={limit <= 0 ? '#CBD5E1' : '#0F172A'} />
                </TouchableOpacity>

                <View style={styles.stepperDisplaySmall}>
                  <Text style={styles.stepperTimeSmall}>{formatScreenTimeDisplay(limit)}</Text>
                  <Text style={styles.stepperUnitSmall}>Daily Limit</Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtnSmall, limit >= 480 && styles.stepperBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={() => handleAdjustChild(child.id, 15)}
                  disabled={limit >= 480}
                  accessibilityLabel={`Increase screen time for ${child.displayName || child.username}`}
                >
                  <MaterialIcons name="add" size={22} color={limit >= 480 ? '#CBD5E1' : '#0F172A'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveChildBtn}
                activeOpacity={0.85}
                onPress={() => handleSaveChild(child)}
              >
                <Text style={styles.saveChildBtnText}>
                  Save for {child.displayName || child.username}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    elevation: 1,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
    borderColor: '#E2E8F0',
  },
  stepperDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperTime: {
    fontSize: 26,
    fontWeight: '900',
    color: '#D97706',
  },
  stepperUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  saveGlobalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5641C',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  saveGlobalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  childrenSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 12,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  childMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  childStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  stepperBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepperDisplaySmall: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperTimeSmall: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D97706',
  },
  stepperUnitSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  saveChildBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 10,
  },
  saveChildBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },
});
