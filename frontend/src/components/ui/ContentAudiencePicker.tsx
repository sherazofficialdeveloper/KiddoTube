import React, { useState } from 'react';
import { FontText as Text } from './FontText';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { ChildDetailDto } from '../../types/api';
import { hexLongToColor } from '../../utils/color';

interface ContentAudiencePickerProps {
  children: ChildDetailDto[];
  selectedChildIds: string[];
  onChange: (childIds: string[]) => void;
}

export const ContentAudiencePicker: React.FC<ContentAudiencePickerProps> = ({
  children,
  selectedChildIds,
  onChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectAll = () => onChange([]);
  const toggleChild = (childId: string) => {
    const next = selectedChildIds.includes(childId)
      ? selectedChildIds.filter((id) => id !== childId)
      : [...selectedChildIds, childId];
    onChange(next.length === 0 ? [] : next);
  };

  const isAllSelected = selectedChildIds.length === 0;

  // Selected label when > 3 children
  const getSelectedLabel = () => {
    if (isAllSelected) return 'All children';
    if (selectedChildIds.length === 1) {
      const match = children.find((c) => c.id === selectedChildIds[0]);
      return match ? match.displayName || match.username : '1 child';
    }
    return `${selectedChildIds.length} children selected`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Who can watch?</Text>

      {children.length <= 3 ? (
        // <= 3 children: Show inline chip buttons
        <View style={styles.options}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: isAllSelected }}
            style={[
              styles.option,
              isAllSelected && styles.optionSelected,
            ]}
            onPress={selectAll}
          >
            <MaterialIcons
              name="groups"
              size={20}
              color={isAllSelected ? '#FFFFFF' : '#000000'}
            />
            <Text
              style={[
                styles.optionText,
                isAllSelected && styles.optionTextSelected,
              ]}
            >
              All children
            </Text>
          </TouchableOpacity>
          {children.map((child) => {
            const selected = selectedChildIds.includes(child.id);
            return (
              <TouchableOpacity
                key={child.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => toggleChild(child.id)}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: hexLongToColor(child.colorHex) },
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{child.avatarEmoji}</Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {child.displayName || child.username}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        // > 3 children: Single button opening list modal
        <>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.dropdownBtnLeft}>
              <MaterialIcons name="groups" size={22} color="#0284C7" />
              <View>
                <Text style={styles.dropdownSelectedLabel}>Audience</Text>
                <Text style={styles.dropdownSelectedValue}>{getSelectedLabel()}</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-drop-down" size={26} color="#64748B" />
          </TouchableOpacity>

          <Modal
            visible={isModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsModalOpen(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setIsModalOpen(false)}
            >
              <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Audience</Text>
                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 350 }}>
                  <TouchableOpacity
                    style={[styles.modalItem, isAllSelected && styles.modalItemSelected]}
                    onPress={selectAll}
                  >
                    <MaterialIcons
                      name="groups"
                      size={24}
                      color={isAllSelected ? '#0284C7' : '#64748B'}
                    />
                    <Text style={[styles.modalItemText, isAllSelected && styles.modalItemTextSelected]}>
                      All children (Recommended)
                    </Text>
                    {isAllSelected && (
                      <MaterialIcons name="check" size={20} color="#0284C7" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>

                  {children.map((child) => {
                    const selected = selectedChildIds.includes(child.id);
                    return (
                      <TouchableOpacity
                        key={child.id}
                        style={[styles.modalItem, selected && styles.modalItemSelected]}
                        onPress={() => toggleChild(child.id)}
                      >
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: hexLongToColor(child.colorHex) },
                          ]}
                        >
                          <Text style={styles.avatarEmoji}>{child.avatarEmoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>
                            {child.displayName || child.username}
                          </Text>
                          <Text style={styles.modalSubText}>@{child.username}</Text>
                        </View>
                        {selected && (
                          <MaterialIcons name="check" size={20} color="#0284C7" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
  },
  label: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  optionSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    elevation: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  optionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownSelectedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  dropdownSelectedValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  modalItemTextSelected: {
    color: '#0284C7',
    fontWeight: '900',
  },
  modalSubText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
