
import { FontText as Text } from './FontText';

import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Dimensions } from '../../theme/dimensions';
import { VideoCategory } from '../../types/models';
import { CATEGORY_TABS } from '../../constants/tabs';
import { useKidsTheme } from '../../theme/ThemeProvider';

/**
 * KidsCategoryRow
 * Bold, prominent category chips matching privacy.html style.
 * Active chip: dark background + white text
 * Inactive chip: tinted container + high-contrast text
 */

interface KidsCategoryRowProps {
  selectedCategory: VideoCategory;
  onCategorySelected: (category: VideoCategory) => void;
}

export const KidsCategoryRow: React.FC<KidsCategoryRowProps> = ({
  selectedCategory,
  onCategorySelected,
}) => {
  const { isDark } = useKidsTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {CATEGORY_TABS.map((meta) => {
        const isSelected = meta.category === selectedCategory;

        return (
          <TouchableOpacity
            key={meta.category}
            activeOpacity={0.7}
            onPress={() => onCategorySelected(meta.category)}
            style={[
              styles.chip,
              isSelected
                ? (isDark ? styles.chipActiveDark : styles.chipActive)
                : (isDark ? styles.chipInactiveDark : styles.chipInactive),
            ]}
            testID={`category_pill_${meta.category.toLowerCase()}`}
          >
            <MaterialIcons
              name={meta.icon}
              size={20}
              color={
                isSelected
                  ? '#FFFFFF'
                  : isDark
                  ? '#F8FAFC'
                  : '#0F172A'
              }
            />
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : isDark
                    ? '#F8FAFC'
                    : '#0F172A',
                },
              ]}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Dimensions.spaceMedium,
    paddingVertical: 6,
    gap: 10,
  },
  chip: {
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chipActiveDark: {
    backgroundColor: '#E52E2E',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  chipInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
  },
  chipInactiveDark: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
  },
  chipText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    fontWeight: '800',
    marginLeft: 7,
  },
});
