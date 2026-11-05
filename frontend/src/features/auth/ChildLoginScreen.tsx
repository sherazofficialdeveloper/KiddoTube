// src/features/auth/ChildLoginScreen.tsx
import { ChildFontText as Text, ChildFontTextInput as TextInput } from '../../components/ui/ChildFontText';

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import { hexLongToColor } from '../../utils/color';
import { useContentStore } from '../../store/contentStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { KiddoTubeLogo } from '../../components/branding';
import { AuthMode, ScreenState } from '../../types/navigation';
import type { RootStackParamList } from '../../types/navigation';
import type { ChildProfile } from '../../types/models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * ChildLoginScreen
 * Migrated 1:1 from Kotlin ChildLoginScreen.kt
 * 
 * Uses navigation prop for stack behavior.
 * onParentSettingsClick is passed via navigation params (optional prop).
 */

type ChildLoginScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.CHILD_LOGIN
> & {
  onParentSettingsClick?: (mode?: AuthMode) => void;
};

export const ChildLoginScreen: React.FC<ChildLoginScreenProps> = ({
  navigation,
  onParentSettingsClick,
}) => {
  const insets = useSafeAreaInsets();
  const childProfiles = useContentStore((s) => s.childProfiles);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    useContentStore.getState().initializeAppData();

    const unsubscribe = navigation.addListener('focus', () => {
      useContentStore.getState().initializeAppData();
    });
    return unsubscribe;
  }, [navigation]);

  const executeLogin = async (
    userToAuth: string,
    passToAuth: string,
    profileId: string | null
  ) => {
    const cleanUser = userToAuth.trim();
    const cleanPass = passToAuth.trim();

    if (!cleanUser && !profileId) {
      setErrorMessage('Please choose your profile or enter your name! 🎈');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Please enter your secret password! 🔑');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await useContentStore
      .getState()
      .loginChild(cleanUser, cleanPass, profileId);

    setIsLoading(false);

    if (result.success) {
      const token = useContentStore.getState().getCurrentToken();
      const profile = useContentStore.getState().selectedProfile;
      if (token && profile) {
        try {
          await useScreenTimeStore
            .getState()
            .initializeForChild(
              token,
              profile.id,
              profile.parentId,
              profile.dailyLimitMinutes
            );
        } catch (stErr: any) {
          console.warn('[ChildLoginScreen] ScreenTime init notice:', stErr?.message);
        }
      }
      navigation.replace(ScreenState.HOME);
    } else {
      setErrorMessage(
        result.error ?? 'Incorrect password. Ask mom or dad for help!'
      );
    }
  };

  const handleProfileTap = (profile: ChildProfile) => {
    setSelectedProfileId(profile.id);
    setUsername(profile.username || profile.name);
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 120, 220) },
          ]}
          scrollEnabled={isKeyboardVisible}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
        <View style={styles.logoWrap}>
          <KiddoTubeLogo size="large" showTagline={true} />
        </View>

        <View style={styles.whoHeaderWrap}>
          <Text style={styles.whoHeaderTitle}>Who's watching?</Text>
          <Text style={styles.whoHeaderSubtitle}>Only approved videos for that profile.</Text>
        </View>

        <Text style={styles.profileLabel}>Tap Your Profile</Text>

        <View style={styles.profileRow}>
          {childProfiles.map((profile) => {
            const isSelected = selectedProfileId === profile.id;
            const bgColor = hexLongToColor(profile.colorHex);

            return (
              <TouchableOpacity
                key={profile.id}
                style={styles.profilePill}
                activeOpacity={0.85}
                onPress={() => handleProfileTap(profile)}
                testID={`profile_pill_${profile.name.toLowerCase()}`}
              >
                <View
                  style={[
                    styles.profileAvatar,
                    {
                      backgroundColor: bgColor,
                      borderWidth: isSelected ? 3 : 0,
                      borderColor: isSelected
                        ? Colors.kidsPrimary
                        : 'transparent',
                    },
                  ]}
                >
                  <Text style={styles.profileEmoji}>
                    {profile.avatarEmoji}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.profileName,
                    {
                      color: isSelected
                        ? Colors.kidsPrimary
                        : Colors.kidsTextPrimary,
                      fontWeight: isSelected ? '900' : '700',
                    },
                  ]}
                >
                  {profile.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.credentialsCard}>
          <Text style={styles.cardTitle}>Sign In With Your Account</Text>

          {/* Username Field with Label */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Child Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                const clean = t.trim().toLowerCase();
                const matched = childProfiles.find(
                  (p) =>
                    p.name.toLowerCase() === clean ||
                    p.username?.toLowerCase() === clean
                );
                setSelectedProfileId(matched ? matched.id : null);
                setErrorMessage(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              testID="username_input"
            />
          </View>

          {/* Password Field with Label */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage(null);
                }}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                numberOfLines={1}
                testID="password_input"
                onSubmitEditing={() =>
                  executeLogin(username, password, selectedProfileId)
                }
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                accessibilityLabel="Toggle password visibility"
              >
                <MaterialIcons
                  name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={Colors.kidsTextMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() =>
              executeLogin(username, password, selectedProfileId)
            }
            disabled={isLoading}
            testID="login_button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

          {/* Parents & Guardians Single Gateway Button */}
          <View style={styles.guardianAccessWrap}>
            <TouchableOpacity
              style={styles.guardianAccessButton}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate(ScreenState.PARENT_AUTH, { initialTab: 'login' })
              }
              testID="parents_guardians_access_button"
            >
              <View style={styles.guardianIconCircle}>
                <MaterialIcons name="family-restroom" size={24} color="#3A9BE8" />
              </View>
              <View style={styles.guardianTextWrap}>
                <View style={styles.guardianHeaderRow}>
                  <Text style={styles.guardianButtonTitle}>Parents & Guardians Access</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#3A9BE8" />
                </View>
                <Text style={styles.guardianButtonSubtitle}>
                  Parent sign in, account setup & admin portal
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.kidsBackground },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Dimensions.spaceLarge,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  whoHeaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  whoHeaderTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
  },
  whoHeaderSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginTop: 2,
  },
  greeting: {
    ...Typography.titleMedium,
    color: '#000000',
    fontWeight: '700',
    marginTop: 6,
  },
  profileLabel: {
    ...Typography.labelMedium,
    color: '#000000',
    fontWeight: '800',
    marginTop: Dimensions.spaceLarge,
  },
  profileRow: {
    flexDirection: 'row',
    marginTop: Dimensions.spaceSmall,
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  profilePill: { alignItems: 'center', padding: 4 },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: { fontSize: 30 },
  profileName: {
    ...Typography.labelMedium,
    color: '#000000',
    fontWeight: '800',
    marginTop: 4,
  },
  credentialsCard: {
    width: '100%',
    backgroundColor: Colors.kidsSurface,
    borderRadius: Dimensions.radiusLarge,
    padding: 16,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    ...Typography.titleMedium,
    color: '#000000',
    fontWeight: '900',
    marginBottom: 10,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  passwordWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '800',
    lineHeight: 20,
  },
  loginButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: Dimensions.radiusPill,
    backgroundColor: Colors.kidsPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Dimensions.spaceLarge,
    shadowColor: Colors.kidsPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  // Adult & Guardian Management Actions
  guardianAccessWrap: {
    width: '100%',
    marginTop: 12,
  },
  guardianAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3A9BE8',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#3A9BE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  guardianIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guardianTextWrap: {
    flex: 1,
  },
  guardianHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guardianButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  guardianButtonSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
    lineHeight: 18,
  },
});