// src/components/ui/ContentFilterModal.tsx
import { FontText as Text, FontTextInput as TextInput } from './FontText';

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export type FilterModalType = 'date' | 'month' | 'year' | 'user' | null;

export interface FilterSelection {
  type: 'date' | 'month' | 'year' | 'user';
  value: string; // ISO date string 'YYYY-MM-DD', or month index '0'-'11', or year '2026', or username
  displayLabel: string;
}

interface ContentFilterModalProps {
  visible: boolean;
  type: FilterModalType;
  currentFilter: FilterSelection | null;
  usersList?: Array<{ id: string; username: string; displayName?: string }>;
  userLabel?: string;
  onClose: () => void;
  onApplyFilter: (filter: FilterSelection | null) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ContentFilterModal: React.FC<ContentFilterModalProps> = ({
  visible,
  type,
  currentFilter,
  usersList = [],
  userLabel = 'Parent',
  onClose,
  onApplyFilter,
}) => {
  // Calendar navigation state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (currentFilter?.type === 'date') {
      const parts = currentFilter.value.split('-');
      if (parts.length === 3) return parseInt(parts[2], 10);
    }
    return null;
  });

  // Month & Year state
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    if (currentFilter?.type === 'month') return parseInt(currentFilter.value, 10);
    return null;
  });

  const [selectedYear, setSelectedYear] = useState<number | null>(() => {
    if (currentFilter?.type === 'year') return parseInt(currentFilter.value, 10);
    return null;
  });

  // User filter state
  const [userQuery, setUserQuery] = useState(
    currentFilter?.type === 'user' ? currentFilter.value : ''
  );

  if (!visible || !type) return null;

  // Calendar calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const handlePrevCalMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
    setSelectedDay(null);
  };

  const handleNextCalMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
    setSelectedDay(null);
  };

  const handleApplyDate = (day: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoDate = `${calYear}-${mm}-${dd}`;
    const label = `${MONTH_NAMES[calMonth].slice(0, 3)} ${day}, ${calYear}`;
    onApplyFilter({ type: 'date', value: isoDate, displayLabel: label });
    onClose();
  };

  const handleApplyMonth = (mIdx: number) => {
    onApplyFilter({
      type: 'month',
      value: String(mIdx),
      displayLabel: `${MONTH_NAMES[mIdx]}`,
    });
    onClose();
  };

  const handleApplyYear = (yr: number) => {
    onApplyFilter({
      type: 'year',
      value: String(yr),
      displayLabel: `Year ${yr}`,
    });
    onClose();
  };

  const handleApplyUser = (
    userOrString: string | { id?: string; username: string; displayName?: string }
  ) => {
    let name = '';
    if (typeof userOrString === 'string') {
      name = userOrString.trim();
    } else {
      name = (userOrString.displayName || userOrString.username || 'Parent').trim();
    }
    if (!name) return;
    onApplyFilter({
      type: 'user',
      value: name,
      displayLabel: name,
    });
    onClose();
  };

  const handleClear = () => {
    onApplyFilter(null);
    onClose();
  };

  // Filtered users list
  const filteredUsers = usersList.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <MaterialIcons
                    name={
                      type === 'date'
                        ? 'calendar-today'
                        : type === 'month'
                        ? 'date-range'
                        : type === 'year'
                        ? 'event'
                        : 'person-search'
                    }
                    size={24}
                    color="#0284C7"
                  />
                  <Text style={styles.headerTitle}>
                    {type === 'date' && 'Filter by Exact Date'}
                    {type === 'month' && 'Filter by Month'}
                    {type === 'year' && 'Filter by Year'}
                    {type === 'user' && `Filter by ${userLabel}`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* 1. DATE CALENDAR VIEW */}
              {type === 'date' && (
                <View style={styles.body}>
                  <View style={styles.calNavRow}>
                    <TouchableOpacity style={styles.calNavBtn} onPress={handlePrevCalMonth}>
                      <MaterialIcons name="chevron-left" size={26} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.calNavTitle}>
                      {MONTH_NAMES[calMonth]} {calYear}
                    </Text>
                    <TouchableOpacity style={styles.calNavBtn} onPress={handleNextCalMonth}>
                      <MaterialIcons name="chevron-right" size={26} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  {/* Day of Week Headers */}
                  <View style={styles.daysOfWeekRow}>
                    {DAYS_OF_WEEK.map((d) => (
                      <Text key={d} style={styles.dayOfWeekText}>
                        {d}
                      </Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {/* Empty blanks for previous month offset */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <View key={`blank_${i}`} style={styles.dayCellBlank} />
                    ))}

                    {/* Day numbers */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const isSelected = selectedDay === day;
                      return (
                        <TouchableOpacity
                          key={`day_${day}`}
                          style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                          onPress={() => {
                            setSelectedDay(day);
                            handleApplyDate(day);
                          }}
                        >
                          <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 2. MONTH SELECTOR */}
              {type === 'month' && (
                <View style={styles.body}>
                  <Text style={styles.subPrompt}>Select a month to filter approved videos:</Text>
                  <View style={styles.chipsGrid}>
                    {MONTH_NAMES.map((mName, idx) => {
                      const isSelected = selectedMonth === idx;
                      return (
                        <TouchableOpacity
                          key={mName}
                          style={[styles.chipButton, isSelected && styles.chipButtonSelected]}
                          onPress={() => {
                            setSelectedMonth(idx);
                            handleApplyMonth(idx);
                          }}
                        >
                          <Text style={[styles.chipButtonText, isSelected && styles.chipButtonTextSelected]}>
                            {mName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 3. YEAR SELECTOR */}
              {type === 'year' && (
                <View style={styles.body}>
                  <Text style={styles.subPrompt}>Select a year to filter approved videos:</Text>
                  <View style={styles.chipsGrid}>
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => {
                      const isSelected = selectedYear === yr;
                      return (
                        <TouchableOpacity
                          key={yr}
                          style={[styles.chipButton, isSelected && styles.chipButtonSelected]}
                          onPress={() => {
                            setSelectedYear(yr);
                            handleApplyYear(yr);
                          }}
                        >
                          <Text style={[styles.chipButtonText, isSelected && styles.chipButtonTextSelected]}>
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 4. USER / CREATOR SELECTOR */}
              {type === 'user' && (
                <View style={styles.body}>
                  <View style={styles.userSearchInputWrap}>
                    <MaterialIcons name="search" size={20} color="#0284C7" />
                    <TextInput
                      style={styles.userSearchInput}
                      placeholder={`Type ${userLabel.toLowerCase()} name...`}
                      placeholderTextColor="#94A3B8"
                      value={userQuery}
                      onChangeText={setUserQuery}
                      autoCapitalize="none"
                      onSubmitEditing={() => handleApplyUser(userQuery)}
                    />
                    {userQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setUserQuery('')}>
                        <MaterialIcons name="clear" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {userQuery.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.customUserApplyBtn}
                      onPress={() => handleApplyUser(userQuery)}
                    >
                      <MaterialIcons name="filter-list" size={18} color="#FFFFFF" />
                      <Text style={styles.customUserApplyText}>Filter by: "{userQuery.trim()}"</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.userListTitle}>Or select a registered {userLabel.toLowerCase()}:</Text>

                  <ScrollView style={styles.userListScroll} showsVerticalScrollIndicator={false}>
                    {filteredUsers.length === 0 ? (
                      <Text style={styles.emptyUserText}>No matching users found.</Text>
                    ) : (
                      filteredUsers.map((u) => {
                        const displayName = u.displayName || u.username || 'Parent';
                        const isSelected =
                          currentFilter?.value.toLowerCase() === displayName.toLowerCase() ||
                          currentFilter?.value.toLowerCase() === u.username.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={u.id}
                            style={[styles.userItem, isSelected && styles.userItemSelected]}
                            onPress={() => handleApplyUser(u)}
                          >
                            <View style={styles.userAvatarMini}>
                              <MaterialIcons name="person" size={20} color="#0284C7" />
                            </View>
                            <View style={styles.userInfoWrap}>
                              <Text style={styles.userItemName}>{displayName}</Text>
                              <Text style={styles.userItemSub}>
                                {u.username && u.username !== displayName && !u.username.startsWith('parent_')
                                  ? `@${u.username}`
                                  : 'Parent Account'}
                              </Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check-circle" size={20} color="#0284C7" />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Footer Actions */}
              <View style={styles.footer}>
                {currentFilter ? (
                  <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                    <MaterialIcons name="filter-alt-off" size={18} color="#DC2626" />
                    <Text style={styles.clearBtnText}>Clear Filter</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  },
  body: {
    paddingVertical: 14,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  calNavTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  dayOfWeekText: {
    width: 38,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellBlank: {
    width: `${100 / 7}%`,
    height: 40,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: '#0284C7',
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  subPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 14,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 90,
    alignItems: 'center',
  },
  chipButtonSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  chipButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  chipButtonTextSelected: {
    color: '#FFFFFF',
  },
  userSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    marginBottom: 10,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  customUserApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 12,
  },
  customUserApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
  },
  userListScroll: {
    maxHeight: 180,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  userItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  userAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoWrap: {
    flex: 1,
  },
  userItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userItemSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyUserText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  doneBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
});

