import React from 'react';
import { FontText as Text } from './FontText';
import {
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
  const selectAll = () => onChange([]);
  const toggleChild = (childId: string) => {
    const next = selectedChildIds.includes(childId)
      ? selectedChildIds.filter((id) => id !== childId)
      : [...selectedChildIds, childId];
    onChange(next.length === 0 ? [] : next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Who can watch?</Text>
      <View style={styles.options}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: selectedChildIds.length === 0 }}
          style={[
            styles.option,
            selectedChildIds.length === 0 && styles.optionSelected,
          ]}
          onPress={selectAll}
        >
          <MaterialIcons
            name="groups"
            size={20}
            color={selectedChildIds.length === 0 ? '#FFFFFF' : '#000000'}
          />
          <Text
            style={[
              styles.optionText,
              selectedChildIds.length === 0 && styles.optionTextSelected,
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
});
