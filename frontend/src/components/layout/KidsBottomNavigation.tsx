import React from 'react';
import { FontText as Text } from '../ui/FontText';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import { useKidsTheme } from '../../theme/ThemeProvider';
import { ChildTab } from '../../types/navigation';

/**
 * KidsBottomNavigation
 * 
 * 4 tabs:
 * 1. Home
 * 2. Search
 * 3. Your stuff (Explore)
 * 4. Menu (Contains Profile, Appearance Light/Dark mode, Bedtime, Care Settings)
 */

interface TabMeta {
  tab: ChildTab;
  label: string;
  activeIcon: MaterialIconsIconName;
  inactiveIcon: MaterialIconsIconName;
}

const TABS: TabMeta[] = [
  {
    tab: ChildTab.HOME,
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-filled',
  },
  {
    tab: ChildTab.SEARCH,
    label: 'Search',
    activeIcon: 'search',
    inactiveIcon: 'search',
  },
  {
    tab: ChildTab.EXPLORE,
    label: 'Your stuff',
    activeIcon: 'star',
    inactiveIcon: 'star-border',
  },
  {
    tab: ChildTab.PROFILE,
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
];

interface KidsBottomNavigationProps {
  selectedTab: ChildTab;
  profileEmoji?: string;
  onTabSelected: (tab: ChildTab) => void;
}

export const KidsBottomNavigation: React.FC<KidsBottomNavigationProps> = ({
  selectedTab,
  profileEmoji = '🐰',
  onTabSelected,
}) => {
  const { colors, isDark } = useKidsTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.bottomNavBg : '#FFFFFF',
          borderTopColor: isDark ? colors.bottomNavBorder : '#E2E8F0',
          paddingBottom: bottomPad,
          height: 60 + bottomPad,
        },
      ]}
    >
      <View style={styles.row}>
        {TABS.map((meta) => {
          const isSelected = meta.tab === selectedTab;

          return (
            <TouchableOpacity
              key={meta.tab}
              style={styles.tab}
              activeOpacity={0.75}
              onPress={() => onTabSelected(meta.tab)}
              testID={`nav_tab_${meta.tab.toLowerCase()}`}
            >
              {meta.tab === ChildTab.PROFILE ? (
                // Profile tab with child's avatar preview circle (no menu badge)
                <View
                  style={[
                    styles.menuBadgeWrap,
                    isSelected && {
                      borderColor: '#E52E2E',
                      backgroundColor: isDark ? '#334155' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text style={styles.menuBadgeEmoji}>{profileEmoji}</Text>
                </View>
              ) : (
                <MaterialIcons
                  name={isSelected ? meta.activeIcon : meta.inactiveIcon}
                  size={26}
                  color={isSelected ? '#E52E2E' : '#000000'}
                />
              )}

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isSelected ? '#E52E2E' : '#000000',
                    fontWeight: '800',
                  },
                ]}
              >
                {meta.label}
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
    width: '100%',
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  menuBadgeWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuBadgeEmoji: {
    fontSize: 18,
  },
  menuIndicatorDot: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3A9BE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    fontWeight: '800',
    marginTop: 2,
    color: '#000000',
  },
});