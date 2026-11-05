import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Dimensions } from '../../theme/dimensions';
import { KiddoTubeLogo } from '../branding';
import { useKidsTheme } from '../../theme/ThemeProvider';

/**
 * KidsHeader
 * KiddoTube Top App Bar
 * 
 * - Left: KiddoTube Flying Sun branding badge
 * - Right: Cast icon, Safety shield icon, Settings gear icon
 */

interface KidsHeaderProps {
  remainingMinutes?: number;
  onCastPress?: () => void;
  onPolicyPress?: () => void;
  onSettingsPress?: () => void;
}

export const KidsHeader: React.FC<KidsHeaderProps> = ({
  onCastPress,
  onPolicyPress,
  onSettingsPress,
}) => {
  const { isDark } = useKidsTheme();
  const iconColor = isDark ? '#FFFFFF' : '#212121';

  return (
    <View style={styles.container}>
      {/* Left: KiddoTube Logo */}
      <View style={styles.brandingRow} testID="app_branding_logo">
        <KiddoTubeLogo size="small" showTagline={false} />
      </View>

      {/* Right: Cast, Shield, Settings icons */}
      <View style={styles.actionsRow}>
        {/* Cast icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onCastPress}
          testID="cast_button"
          accessibilityRole="button"
          accessibilityLabel="Cast to device"
        >
          <MaterialIcons
            name="cast"
            size={23}
            color={iconColor}
          />
        </TouchableOpacity>

        {/* Policy / Shield icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPolicyPress}
          testID="safety_shield_button"
          accessibilityRole="button"
          accessibilityLabel="Safety and policy"
        >
          <MaterialIcons
            name="shield"
            size={22}
            color={iconColor}
          />
        </TouchableOpacity>

        {/* Settings gear icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSettingsPress}
          testID="header_settings_button"
          accessibilityRole="button"
          accessibilityLabel="Parents settings passcode"
        >
          <MaterialIcons
            name="settings"
            size={23}
            color={iconColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Dimensions.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBadge: {
    width: 36,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  logoKids: {
    fontSize: 22,
    fontWeight: '900',
    color: '#212121',
    marginLeft: 7,
    letterSpacing: -0.5,
  },
  doodleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  doodleIcon: {
    opacity: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});