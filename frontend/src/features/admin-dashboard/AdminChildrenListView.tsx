// src/features/admin-dashboard/AdminChildrenListView.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { AdminChildItemDto } from '../../types/api';

interface AdminChildrenListViewProps {
  children: AdminChildItemDto[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleStatus: (childId: string, targetStatus?: string) => void;
  onDeleteChild: (childId: string) => void;
}

export const AdminChildrenListView: React.FC<AdminChildrenListViewProps> = ({
  children,
  searchQuery,
  onSearchChange,
  onToggleStatus,
  onDeleteChild,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  const filtered = children.filter((c) => {
    if (filterStatus === 'ACTIVE') return c.status === 'ACTIVE';
    if (filterStatus === 'DISABLED') return c.status === 'DISABLED';
    return true;
  });

  const confirmAction = (child: AdminChildItemDto, targetStatus: 'ACTIVE' | 'DISABLED') => {
    const actionLabel = targetStatus === 'ACTIVE' ? 'Activate' : 'Deactivate';
    Alert.alert(
      `${actionLabel} Explorer Profile`,
      `Are you sure you want to ${actionLabel.toLowerCase()} child account "${child.displayName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: 'default',
          onPress: () => onToggleStatus(child.id, targetStatus),
        },
      ]
    );
  };

  const confirmDelete = (child: AdminChildItemDto) => {
    Alert.alert(
      'Delete Child Account',
      `Permanently delete child account "${child.displayName}" from the database? All watch history and progress will also be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => onDeleteChild(child.id),
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Title */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>All Explorers Directory ({children.length})</Text>
          <Text style={styles.subtitle}>Supervise children accounts and profiles</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={22} color="#E52E2E" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by child name or parent username..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <MaterialIcons name="clear" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((st) => {
          const isSelected = filterStatus === st;
          return (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(st)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Deactivated'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.92}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="search-off" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching child explorers</Text>
          </View>
        ) : (
          filtered.map((child) => {
            const status = child.status || 'ACTIVE';
            const isActive = status === 'ACTIVE';
            const isBlocked = status === 'BLOCKED';
            const isDisabled = status === 'DISABLED';

            return (
              <View key={child.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {/* Emoji Avatar */}
                  <View style={styles.avatarWrap}>
                    <Text style={styles.emoji}>{child.avatarEmoji || '🚀'}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{child.displayName}</Text>
                    <Text style={styles.cardUsername}>@{child.username}</Text>
                    <Text style={styles.cardMeta}>
                      Parent: <Text style={styles.boldText}>@{child.parentUsername || 'parent'}</Text>
                    </Text>
                  </View>

                  {/* Status Pill */}
                  <View
                    style={[
                      styles.statusPill,
                      isActive && styles.statusPillActive,
                      isDisabled && styles.statusPillDisabled,
                      isBlocked && styles.statusPillBlocked,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isActive && { backgroundColor: '#10B981' },
                        isDisabled && { backgroundColor: '#F59E0B' },
                        isBlocked && { backgroundColor: '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isActive && { color: '#065F46' },
                        isDisabled && { color: '#92400E' },
                        isBlocked && { color: '#991B1B' },
                      ]}
                    >
                      {isActive ? 'Active' : isDisabled ? 'Deactivated' : 'Blocked'}
                    </Text>
                  </View>
                </View>

                {/* 3 Explicit Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isActive ? styles.actionBtnActiveCurrent : styles.actionBtnActivate,
                    ]}
                    onPress={() => confirmAction(child, 'ACTIVE')}
                    disabled={isActive}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={isActive ? '#059669' : '#047857'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: isActive ? '#059669' : '#047857' },
                      ]}
                    >
                      {isActive ? 'Active ✓' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isDisabled ? styles.actionBtnDisabledCurrent : styles.actionBtnDeactivate,
                    ]}
                    onPress={() => confirmAction(child, 'DISABLED')}
                    disabled={isDisabled}
                  >
                    <MaterialIcons
                      name="pause-circle-outline"
                      size={16}
                      color={isDisabled ? '#D97706' : '#B45309'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: isDisabled ? '#D97706' : '#B45309' },
                      ]}
                    >
                      {isDisabled ? 'Deactivated ✓' : 'Deactivate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.actionBtnDelete,
                    ]}
                    onPress={() => confirmDelete(child)}
                  >
                    <MaterialIcons
                      name="delete-forever"
                      size={16}
                      color="#DC2626"
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: '#DC2626' },
                      ]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#E52E2E',
    borderColor: '#E52E2E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  emoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E52E2E',
    marginTop: 1,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillDisabled: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillBlocked: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnActivate: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  actionBtnActiveCurrent: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    opacity: 0.7,
  },
  actionBtnDeactivate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  actionBtnDisabledCurrent: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    opacity: 0.7,
  },
  actionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionBtnBlock: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionBtnBlockedCurrent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
});