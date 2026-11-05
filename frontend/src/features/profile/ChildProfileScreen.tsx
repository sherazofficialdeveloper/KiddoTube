import React, { useState } from 'react';
import { ChildFontText as Text } from '../../components/ui/ChildFontText';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import { useKidsTheme } from '../../theme/ThemeProvider';
import { useThemeStore } from '../../store/themeStore';
import { useSafeVolumeStore } from '../../store/safeVolumeStore';
import { useContentStore } from '../../store/contentStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { ScreenState, ChildTab } from '../../types/navigation';
import { navigate, resetToChildLogin } from '../../app/navigation/navigationRef';
import { KidsBottomNavigation } from '../../components/layout/KidsBottomNavigation';
import { ParentsPasscodeModal } from '../parental/ParentsPasscodeModal';
import { ParentExtensionDialog } from '../parental/ParentExtensionDialog';
import {
  CHILD_AGE_BANDS,
  CHILD_AVATAR_COLORS,
  CHILD_AVATARS,
  getChildAgeBandLabel,
} from '../../constants/childProfiles';
import { hexLongToColor } from '../../utils/color';

export const ChildProfileScreen: React.FC = () => {
  const { colors, isDark } = useKidsTheme();
  const selectedProfile = useContentStore((state) => state.selectedProfile);
  const logoutChild = useContentStore((state) => state.logoutChild);
  const updateCurrentChildAvatar = useContentStore(
    (state) => state.updateCurrentChildAvatar
  );
  const remainingMinutes = useScreenTimeStore((state) => state.remainingMinutes);
  const captionsEnabled = useThemeStore((state) => state.captionsEnabled);
  const toggleCaptions = useThemeStore((state) => state.toggleCaptions);
  const safeVolumeEnabled = useSafeVolumeStore((state) =>
    state.isEnabled(selectedProfile?.id)
  );
  const safeVolumeLoaded = useSafeVolumeStore((state) => state.isLoaded);
  const setSafeVolumeEnabled = useSafeVolumeStore((state) => state.setEnabled);
  const eyeBreakEnabled = useThemeStore((state) => state.eyeBreakEnabled);
  const toggleEyeBreak = useThemeStore((state) => state.toggleEyeBreak);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  const [showLogoutGate, setShowLogoutGate] = useState(false);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingSafeVolume, setIsUpdatingSafeVolume] = useState(false);

  const avatarEmoji = selectedProfile?.avatarEmoji || CHILD_AVATARS[0];
  const avatarColor = selectedProfile?.colorHex || CHILD_AVATAR_COLORS[0];
  const childName = selectedProfile?.name || 'Kiddo Explorer';
  const rawAge = selectedProfile?.ageGroup ?? (selectedProfile as any)?.age;
  const ageDisplay = getChildAgeBandLabel(rawAge);

  const updateAvatar = async (emoji: string, color = avatarColor) => {
    if (isUpdatingAvatar) return;
    setIsUpdatingAvatar(true);
    const result = await updateCurrentChildAvatar(emoji, color);
    setIsUpdatingAvatar(false);
    if (result.success) {
      setShowAvatarPicker(false);
    } else {
      Alert.alert('Could not update profile', result.error || 'Please try again.');
    }
  };

  const handleSignOut = () => {
    logoutChild();
    useScreenTimeStore.getState().clearSession();
    resetToChildLogin();
  };

  const handleSafeVolumeToggle = async () => {
    const childId = selectedProfile?.id;
    if (!childId || isUpdatingSafeVolume) return;
    setIsUpdatingSafeVolume(true);
    const saved = await setSafeVolumeEnabled(childId, !safeVolumeEnabled);
    setIsUpdatingSafeVolume(false);
    if (!saved) {
      Alert.alert('Could not update safe volume', 'Please try again.');
    }
  };

  const handleBottomTab = (tab: ChildTab) => {
    switch (tab) {
      case ChildTab.HOME:
        navigate(ScreenState.HOME);
        break;
      case ChildTab.SEARCH:
        navigate(ScreenState.SEARCH, { previousScreen: ScreenState.HOME });
        break;
      case ChildTab.EXPLORE:
        navigate(ScreenState.EXPLORE);
        break;
      case ChildTab.PROFILE:
        break;
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="child_profile_screen"
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.topBarBg, borderBottomColor: colors.cardBorder },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate(ScreenState.HOME)}
          accessibilityLabel="Back to videos"
        >
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#000000' }]}>
          Child Profile
        </Text>
        <TouchableOpacity
          style={[
            styles.settingsButton,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
          onPress={() => setShowParentGate(true)}
          accessibilityLabel="Parent time settings"
        >
          <Text style={[styles.remainingTime, { color: colors.textPrimary }]}>
            {remainingMinutes}m
          </Text>
          <MaterialIcons name="settings" size={19} color={colors.kidsSkyBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: hexLongToColor(avatarColor) },
              ]}
            >
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={() => setShowAvatarPicker(true)}
                accessibilityLabel="Change profile icon and color"
              >
                <MaterialIcons name="edit" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text
                style={[styles.childName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {childName}
              </Text>
              <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                {ageDisplay}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.preferencesCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Comfort &amp; safe watching
          </Text>
          <PreferenceToggle
            title="Captions"
            description="Show subtitles when watching videos"
            icon="subtitles"
            value={captionsEnabled}
            onToggle={toggleCaptions}
            colors={colors}
            isDark={isDark}
          />
          <PreferenceToggle
            title="Safe volume"
            description="Keep video volume at a child-safe level"
            icon="volume-down"
            value={safeVolumeEnabled}
            onToggle={handleSafeVolumeToggle}
            disabled={!safeVolumeLoaded || isUpdatingSafeVolume}
            colors={colors}
            isDark={isDark}
          />
          <PreferenceToggle
            title="Eye-break reminder"
            description="A gentle reminder after 20 minutes"
            icon="visibility"
            value={eyeBreakEnabled}
            onToggle={toggleEyeBreak}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutGate(true)}
          accessibilityRole="button"
        >
          <MaterialIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      <KidsBottomNavigation
        selectedTab={ChildTab.PROFILE}
        profileEmoji={avatarEmoji}
        onTabSelected={handleBottomTab}
      />

      <ParentsPasscodeModal
        visible={showLogoutGate}
        onSuccess={() => {
          setShowLogoutGate(false);
          handleSignOut();
        }}
        onDismiss={() => setShowLogoutGate(false)}
      />

      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Pick your profile icon
              </Text>
              <TouchableOpacity
                onPress={() => setShowAvatarPicker(false)}
                accessibilityLabel="Close avatar picker"
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {isUpdatingAvatar ? (
              <Text style={[styles.savingText, { color: colors.textSecondary }]}>
                Saving your choice...
              </Text>
            ) : null}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.avatarScrollContent}
            >
              <View style={styles.avatarGrid}>
                {CHILD_AVATARS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: hexLongToColor(avatarColor) },
                      emoji === avatarEmoji && styles.selectedAvatarOption,
                    ]}
                    onPress={() => updateAvatar(emoji)}
                    disabled={isUpdatingAvatar}
                    accessibilityLabel={`Choose ${emoji} profile icon`}
                  >
                    <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>
                Profile color
              </Text>
              <View style={styles.colorRow}>
                {CHILD_AVATAR_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: hexLongToColor(color) },
                      color === avatarColor && styles.selectedColorOption,
                    ]}
                    onPress={() => updateAvatar(avatarEmoji, color)}
                    disabled={isUpdatingAvatar}
                    accessibilityLabel="Choose profile color"
                  >
                    {color === avatarColor ? (
                      <MaterialIcons name="check" size={19} color="#FFFFFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ParentsPasscodeModal
        visible={showParentGate}
        onSuccess={() => {
          setShowParentGate(false);
          setShowTimeSettings(true);
        }}
        onDismiss={() => setShowParentGate(false)}
      />
      <ParentExtensionDialog
        visible={showTimeSettings}
        timeRemainingMinutes={remainingMinutes}
        onDismiss={() => setShowTimeSettings(false)}
        onConfirmExtension={(minutes) => {
          useScreenTimeStore.setState((state) => ({
            remainingMinutes: state.remainingMinutes + minutes,
            isLocked: false,
          }));
          setShowTimeSettings(false);
        }}
      />
    </SafeAreaView>
  );
};

interface PreferenceToggleProps {
  title: string;
  description: string;
  icon: MaterialIconsIconName;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useKidsTheme>['colors'];
  isDark: boolean;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({
  title,
  description,
  icon,
  value,
  onToggle,
  disabled = false,
  colors,
  isDark,
}) => (
  <View style={[styles.preferenceRow, { borderBottomColor: colors.cardBorder }]}>
    <View
      style={[
        styles.preferenceIcon,
        { backgroundColor: isDark ? '#334155' : '#EAF4FD' },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={colors.kidsSkyBlue} />
    </View>
    <View style={styles.preferenceInfo}>
      <Text style={[styles.preferenceTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.preferenceDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value }}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? colors.kidsSkyBlue : colors.cardBorder },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onToggle}
      disabled={disabled}
    >
      <View
        style={[
          styles.toggleThumb,
          value ? styles.toggleThumbOn : styles.toggleThumbOff,
        ]}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito',
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  settingsButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: 11,
  },
  remainingTime: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 30, gap: 14 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarEmoji: { fontSize: 42 },
  editAvatarButton: {
    position: 'absolute',
    right: -4,
    bottom: -3,
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: { flex: 1 },
  childName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  ageText: {
    fontFamily: 'Nunito',
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginTop: 4,
  },
  preferencesCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 17,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
  },
  preferenceRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  preferenceIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceInfo: { flex: 1 },
  preferenceTitle: {
    fontFamily: 'Nunito',
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  preferenceDescription: {
    fontFamily: 'Nunito',
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  toggleTrack: {
    width: 48,
    height: 29,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleThumbOff: { alignSelf: 'flex-start' },
  logoutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 17,
    backgroundColor: '#FF6F61',
  },
  logoutText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito',
    fontWeight: '900',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    maxHeight: '82%',
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  avatarScrollContent: {
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontFamily: 'Nunito-Bold', fontSize: 21, fontWeight: '600' },
  savingText: { fontFamily: 'Nunito', fontSize: 13, marginBottom: 8 },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  avatarOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarOption: { borderColor: '#1E293B' },
  avatarOptionEmoji: { fontSize: 32 },
  colorLabel: {
    fontFamily: 'Nunito',
    fontWeight: '800',
    fontSize: 15,
    marginTop: 12,
    marginBottom: 9,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedColorOption: { borderColor: '#1E293B' },
});
