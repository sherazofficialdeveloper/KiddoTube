// src/features/admin-dashboard/AdminParentsListView.tsx
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
import type { AdminParentItemDto } from '../../types/api';

interface AdminParentsListViewProps {
  parents: AdminParentItemDto[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleStatus: (parentId: string, targetStatus?: string) => void;
  onDeleteParent: (parentId: string) => void;
  onAddParentClick: () => void;
}

const isIdentifierValue = (value: string): boolean =>
  /^parent_/i.test(value) ||
  /^[a-f0-9]{24}$/i.test(value) ||
  /^67[a-f0-9]{22}$/i.test(value);

const getParentLabel = (parent: AdminParentItemDto): string => {
  const candidates = [
    parent.displayName,
    parent.username,
    parent.email ? parent.email.split('@')[0] : null,
  ];
  return (
    candidates.find(
      (value): value is string =>
        typeof value === 'string' &&
        Boolean(value.trim()) &&
        !isIdentifierValue(value.trim())
    )?.trim() || 'Parent Account'
  );
};

export const AdminParentsListView: React.FC<AdminParentsListViewProps> = ({
  parents,
  searchQuery,
  onSearchChange,
  onToggleStatus,
  onDeleteParent,
  onAddParentClick,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  const filtered = React.useMemo(() => {
    let list = Array.isArray(parents) ? [...parents] : [];

    if (filterStatus === 'ACTIVE') {
      list = list.filter((p) => !p.status || p.status.toUpperCase() === 'ACTIVE');
    } else if (filterStatus === 'DISABLED') {
      list = list.filter(
        (p) => p.status && (p.status.toUpperCase() === 'DISABLED' || p.status.toUpperCase() === 'BLOCKED')
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.username && p.username.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.displayName && p.displayName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [parents, filterStatus, searchQuery]);

  const confirmAction = (parent: AdminParentItemDto, targetStatus: 'ACTIVE' | 'DISABLED') => {
    const actionLabel = targetStatus === 'ACTIVE' ? 'Activate' : 'Deactivate';
    Alert.alert(
      `${actionLabel} Parent Account`,
      `Are you sure you want to ${actionLabel.toLowerCase()} parent account "${parent.username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: 'default',
          onPress: () => onToggleStatus(parent.id, targetStatus),
        },
      ]
    );
  };

  const confirmDelete = (parent: AdminParentItemDto) => {
    Alert.alert(
      'Delete Parent Account',
      `Permanently delete parent "${parent.username}" from the database? All linked children and content will also be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => onDeleteParent(parent.id),
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Parent Accounts ({parents.length})</Text>
          <Text style={styles.subtitle}>Supervise parent guardian accounts</Text>
        </View>
        <TouchableOpacity
          style={styles.addParentBtn}
          onPress={onAddParentClick}
          accessibilityRole="button"
          accessibilityLabel="Add Parent Account"
        >
          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.addParentBtnText}>Add Parent</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={22} color="#0284C7" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or email..."
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

      {/* Parent Cards List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.92}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="search-off" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching parent accounts</Text>
          </View>
        ) : (
          filtered.map((parent) => {
            const status = parent.status || 'ACTIVE';
            const isActive = status === 'ACTIVE';
            const isBlocked = status === 'BLOCKED';
            const isDisabled = status === 'DISABLED';

            return (
              <View key={parent.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {/* Avatar Circle with Logo Blue Accent */}
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {getParentLabel(parent)[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>
                      {getParentLabel(parent)}
                    </Text>
                    <Text style={styles.cardUsername}>@{parent.username}</Text>
                    <Text style={styles.cardMeta}>
                      📧 {parent.email || 'No email'} • 👶 {parent.childrenCount} kids
                    </Text>
                  </View>

                  {/* Status Pill Badge */}
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

                {/* Sub info */}
                <View style={styles.cardDetailsRow}>
                  <Text style={styles.cardDetailsText}>
                    ⏱ Screen limit: <Text style={styles.boldText}>{parent.dailyLimitMinutes || 60}m/day</Text>
                  </Text>
                </View>

                {/* 3 Explicit Action Buttons: Activate | Deactivate | Block */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isActive ? styles.actionBtnActiveCurrent : styles.actionBtnActivate,
                    ]}
                    onPress={() => confirmAction(parent, 'ACTIVE')}
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
                    onPress={() => confirmAction(parent, 'DISABLED')}
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
                    onPress={() => confirmDelete(parent)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addParentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
  },
  addParentBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
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
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
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
    color: '#0284C7',
    marginTop: 1,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
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
  cardDetailsRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardDetailsText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
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