// src/features/parental/ParentAdminAuthDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { AuthMode } from '../../types/navigation';
import { useParentAdminStore } from '../../store/parentAdminStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { KiddoTubeLogo } from '../../components/branding';

/**
 * ParentAdminAuthDialog
 * Migrated 1:1 from Kotlin ParentAdminAuthDialog.kt
 * 
 * Parent Login, Register, and Admin tabs are always available.
 * PIN login is shown only for time-extension access.
 * - Parent Login: Username + password
 * - Register: Create new parent account
 * - Admin: Admin system login
 */

interface ParentAdminAuthDialogProps {
  visible: boolean;
  showPinLogin: boolean;
  initialMode?: AuthMode;
  onDismiss: () => void;
  onOpenParentPanel: (verifiedPin?: string) => void;
  onOpenAdminPanel: () => void;
}

export const ParentAdminAuthDialog: React.FC<ParentAdminAuthDialogProps> = ({
  visible,
  showPinLogin,
  initialMode,
  onDismiss,
  onOpenParentPanel,
  onOpenAdminPanel,
}) => {
  const [selectedMode, setSelectedMode] = useState<AuthMode>(
    initialMode ?? (showPinLogin ? AuthMode.PARENT_PIN : AuthMode.PARENT_LOGIN)
  );
  const [pinValue, setPinValue] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const verifyParentPin = useScreenTimeStore((s) => s.verifyParentPin);

  useEffect(() => {
    if (visible) {
      setSelectedMode(
        initialMode ?? (showPinLogin ? AuthMode.PARENT_PIN : AuthMode.PARENT_LOGIN)
      );
      setRegisterStep(1);
    }
  }, [showPinLogin, visible, initialMode]);

  const resetForm = () => {
    setPinValue('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAdminUser('');
    setAdminPass('');
    setErrorMessage(null);
    setIsLoading(false);
    setRegisterStep(1);
    setAcceptedPrivacyPolicy(false);
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const handleClose = () => {
    resetForm();
    onDismiss();
  };

  const switchMode = (mode: AuthMode) => {
    setSelectedMode(mode);
    setErrorMessage(null);
    if (mode === AuthMode.PARENT_REGISTER) {
      setRegisterStep(1);
    }
  };

  // --- PIN Mode ---
  const handlePinDigit = async (digit: string) => {
    if (pinValue.length >= 4) return;
    setErrorMessage(null);
    const updated = pinValue + digit;
    setPinValue(updated);

    // Auto-verify on 4th digit
    if (updated.length === 4) {
      setIsLoading(true);
      try {
        const result = await verifyParentPin(updated);
        setIsLoading(false);

        if (result.type === 'SUCCESS') {
          onOpenParentPanel(updated);
        } else if (result.type === 'ERROR') {
          setErrorMessage(
            `${result.message} (${result.attemptsLeft} attempts left)`
          );
          setPinValue('');
        } else if (result.type === 'LOCKED_OUT') {
          setErrorMessage(
            `Account locked out for ${result.lockoutSecondsRemaining}s`
          );
          setPinValue('');
        }
      } catch {
        setIsLoading(false);
        setErrorMessage('Verification failed.');
        setPinValue('');
      }
    }
  };

  const handlePinClear = () => {
    setPinValue('');
    setErrorMessage(null);
  };

  const handlePinOk = async () => {
    if (pinValue.length !== 4) return;
    setIsLoading(true);
    try {
      const result = await verifyParentPin(pinValue);
      setIsLoading(false);

      if (result.type === 'SUCCESS') {
        onOpenParentPanel(pinValue);
      } else if (result.type === 'ERROR') {
        setErrorMessage(
          `${result.message} (${result.attemptsLeft} attempts left)`
        );
        setPinValue('');
      } else if (result.type === 'LOCKED_OUT') {
        setErrorMessage(
          `Account locked out for ${result.lockoutSecondsRemaining}s`
        );
        setPinValue('');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Verification failed.');
      setPinValue('');
    }
  };

  // --- Parent Login ---
  const handleParentLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter username and password');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const result = await useParentAdminStore
      .getState()
      .loginParent(username.trim(), password.trim());

    setIsLoading(false);
    if (result.success) {
      onOpenParentPanel();
    } else {
      setErrorMessage(result.error ?? 'Login failed');
    }
  };

  // --- Parent Register ---
  const handleParentRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill all required fields');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const result = await useParentAdminStore
      .getState()
      .registerParent(username.trim(), email.trim(), password.trim());

    setIsLoading(false);
    if (result.success) {
      onOpenParentPanel();
    } else {
      setErrorMessage(result.error ?? 'Registration failed');
    }
  };

  // --- Admin Login ---
  const handleAdminLogin = async () => {
    if (!adminUser.trim() || !adminPass.trim()) {
      setErrorMessage('Please enter admin credentials');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const result = await useParentAdminStore
      .getState()
      .loginAdmin(adminUser, adminPass);

    setIsLoading(false);
    if (result.success) {
      onOpenAdminPanel();
    } else {
      setErrorMessage(result.error ?? 'Admin authentication failed');
    }
  };

  // --- Keypad for PIN mode ---
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'OK'],
  ];

  const isAdminMode = selectedMode === AuthMode.ADMIN_LOGIN;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} testID="parent_admin_auth_dialog">
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with close */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.shieldCircle,
                    {
                      backgroundColor: isAdminMode
                        ? '#1E293B'
                        : Colors.kidsPrimary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isAdminMode ? 'admin-panel-settings' : 'shield'}
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.headerTitle}>
                  {isAdminMode ? 'Admin Access' : 'Parental Access'}
                </Text>
              </View>

              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={Colors.kidsTextPrimary}
                />
              </TouchableOpacity>
            </View>

            {/* KiddoTube Brand Logo */}
            <View style={styles.dialogLogoWrap}>
              <KiddoTubeLogo size="small" showTagline={true} />
            </View>

            {!showPinLogin && (
              <View style={styles.tabsContainer}>
                <TabPill
                  label="Parent Login"
                  isSelected={selectedMode === AuthMode.PARENT_LOGIN}
                  onPress={() => switchMode(AuthMode.PARENT_LOGIN)}
                />
                <TabPill
                  label="Register"
                  isSelected={selectedMode === AuthMode.PARENT_REGISTER}
                  onPress={() => switchMode(AuthMode.PARENT_REGISTER)}
                />
                <TabPill
                  label="Admin"
                  isSelected={selectedMode === AuthMode.ADMIN_LOGIN}
                  onPress={() => switchMode(AuthMode.ADMIN_LOGIN)}
                />
              </View>
            )}
            {showPinLogin && (
              <View style={styles.tabsContainer}>
                <TabPill
                  label="PIN"
                  isSelected={selectedMode === AuthMode.PARENT_PIN}
                  onPress={() => switchMode(AuthMode.PARENT_PIN)}
                />
              </View>
            )}

            {/* --- PIN Mode --- */}
            {showPinLogin && selectedMode === AuthMode.PARENT_PIN && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Enter Parent 4-Digit PIN</Text>
                <Text style={styles.formSubtitle}>
                  Your PIN will be securely verified.
                </Text>

                {/* PIN dots */}
                <View style={styles.pinDotsRow}>
                  {[0, 1, 2, 3].map((i) => {
                    const digit = pinValue[i];
                    return (
                      <View
                        key={i}
                        style={[
                          styles.pinDot,
                          digit ? styles.pinDotFilled : styles.pinDotEmpty,
                        ]}
                      >
                        {digit ? <Text style={styles.pinDotBullet}>●</Text> : null}
                      </View>
                    );
                  })}
                </View>

                {/* Keypad */}
                <View style={styles.keypad}>
                  {keypadRows.map((row, rowIdx) => (
                    <View key={rowIdx} style={styles.keypadRow}>
                      {row.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.keypadButton,
                            key === 'OK' && styles.keypadButtonOk,
                            key === 'C' && styles.keypadButtonClear,
                          ]}
                          activeOpacity={0.75}
                          onPress={() => {
                            if (key === 'C') handlePinClear();
                            else if (key === 'OK') handlePinOk();
                            else handlePinDigit(key);
                          }}
                        >
                          <Text
                            style={[
                              styles.keypadButtonText,
                              key === 'OK' && styles.keypadButtonTextOk,
                            ]}
                          >
                            {key}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* --- Parent Login --- */}
            {selectedMode === AuthMode.PARENT_LOGIN && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Parent Account Sign In</Text>
                <Text style={styles.formSubtitle}>
                  Sign in to manage kids profiles, whitelist channels, and set limits.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Parent Username or Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username or email"
                    placeholderTextColor={Colors.kidsTextMuted}
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Parent Password *</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter parent password"
                      placeholderTextColor={Colors.kidsTextMuted}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setErrorMessage(null);
                      }}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      accessibilityLabel="Toggle password visibility"
                    >
                      <MaterialIcons
                        name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                        size={22}
                        color={Colors.kidsTextMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <PrimaryButton
                  label="Open Parent Dashboard"
                  color={Colors.kidsCoral}
                  loading={isLoading}
                  onPress={handleParentLogin}
                />
              </View>
            )}

            {/* --- Parent Register (2-Step Process) --- */}
            {selectedMode === AuthMode.PARENT_REGISTER && (
              <View style={styles.formSection}>
                {/* Step indicator */}
                <View style={styles.stepIndicatorRow}>
                  <View style={[styles.stepBadge, styles.stepBadgeActive]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <View
                    style={[
                      styles.stepLine,
                      registerStep === 2 && styles.stepLineActive,
                    ]}
                  />
                  <View
                    style={[
                      styles.stepBadge,
                      registerStep === 2
                        ? styles.stepBadgeActive
                        : styles.stepBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepBadgeText,
                        registerStep !== 2 && styles.stepBadgeTextInactive,
                      ]}
                    >
                      2
                    </Text>
                  </View>
                </View>

                {registerStep === 1 ? (
                  // --- Step 1: Safety & Privacy Policy Acceptance ---
                  <View>
                    <Text style={styles.formTitle}>Parent Safety & Privacy Briefing</Text>
                    <Text style={styles.formSubtitle}>
                      Welcome to KiddoTube! We are dedicated to providing a safe, joyful, and ad-free streaming environment for children. Please review our safety commitments before creating your account:
                    </Text>

                    <View style={styles.policyBriefCard}>
                      <View style={styles.policyPoint}>
                        <MaterialIcons
                          name="verified-user"
                          size={24}
                          color={Colors.kidsSkyBlue}
                        />
                        <View style={styles.policyPointTextWrap}>
                          <Text style={styles.policyPointTitle}>
                            100% Parent-Approved Content
                          </Text>
                          <Text style={styles.policyPointDesc}>
                            Kids can only watch videos, channels, and playlists explicitly approved by you. No accidental open-web browsing.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.policyPoint}>
                        <MaterialIcons
                          name="block"
                          size={24}
                          color={Colors.kidsCoral}
                        />
                        <View style={styles.policyPointTextWrap}>
                          <Text style={styles.policyPointTitle}>
                            Zero Ads & Tracking (COPPA / GDPR-K)
                          </Text>
                          <Text style={styles.policyPointDesc}>
                            Strict child privacy standards. No behavioral tracking, targeted advertisements, or external open web links.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.policyPoint}>
                        <MaterialIcons
                          name="alarm"
                          size={24}
                          color={Colors.kidsSunnyYellow}
                        />
                        <View style={styles.policyPointTextWrap}>
                          <Text style={styles.policyPointTitle}>
                            Strict Screen Time Limits
                          </Text>
                          <Text style={styles.policyPointDesc}>
                            Automatic timers pause playback when daily limit expires. Only parents can grant additional viewing time.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.policyPoint}>
                        <MaterialIcons
                          name="lock"
                          size={24}
                          color={Colors.kidsSkyBlue}
                        />
                        <View style={styles.policyPointTextWrap}>
                          <Text style={styles.policyPointTitle}>
                            Protected 4-Digit Parent PIN
                          </Text>
                          <Text style={styles.policyPointDesc}>
                            All account settings, video approvals, and profile management remain securely locked behind your parent PIN.
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Interactive Checkbox */}
                    <TouchableOpacity
                      style={[
                        styles.policyConsentBox,
                        acceptedPrivacyPolicy && styles.policyConsentBoxActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy);
                        setErrorMessage(null);
                      }}
                    >
                      <View
                        style={[
                          styles.checkboxCircle,
                          acceptedPrivacyPolicy && styles.checkboxCircleActive,
                        ]}
                      >
                        {acceptedPrivacyPolicy ? (
                          <MaterialIcons name="check" size={18} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text style={styles.policyConsentText}>
                        I confirm that I am a parent or legal guardian (18+), and I agree to the KiddoTube Family Safety Commitment & Privacy Policy.
                      </Text>
                    </TouchableOpacity>

                    <PrimaryButton
                      label="Accept & Continue (Step 2) ➔"
                      color={
                        acceptedPrivacyPolicy
                          ? Colors.kidsSkyBlue
                          : '#94A3B8'
                      }
                      loading={false}
                      onPress={() => {
                        if (!acceptedPrivacyPolicy) {
                          setErrorMessage(
                            'Please check the box to accept the Safety & Privacy Policy before continuing.'
                          );
                          return;
                        }
                        setErrorMessage(null);
                        setRegisterStep(2);
                      }}
                    />
                  </View>
                ) : (
                  // --- Step 2: Account Details Inputs ---
                  <View>
                    <Text style={styles.formTitle}>Create Real Parent Account</Text>
                    <Text style={styles.formSubtitle}>
                      Step 2: Enter your parent credentials. You will use these to sign in and manage child profiles.
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Parent Username *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Choose parent username (e.g. dad_ali)"
                        placeholderTextColor={Colors.kidsTextMuted}
                        value={username}
                        onChangeText={(t) => {
                          setUsername(t);
                          setErrorMessage(null);
                        }}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Parent Email Address *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="name@example.com"
                        placeholderTextColor={Colors.kidsTextMuted}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          setErrorMessage(null);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Parent Password *</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          style={[styles.input, styles.passwordInput]}
                          placeholder="Password (minimum 6 characters)"
                          placeholderTextColor={Colors.kidsTextMuted}
                          value={password}
                          onChangeText={(t) => {
                            setPassword(t);
                            setErrorMessage(null);
                          }}
                          secureTextEntry={!isPasswordVisible}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() =>
                            setIsPasswordVisible(!isPasswordVisible)
                          }
                          accessibilityLabel="Toggle password visibility"
                        >
                          <MaterialIcons
                            name={
                              isPasswordVisible
                                ? 'visibility-off'
                                : 'visibility'
                            }
                            size={22}
                            color={Colors.kidsTextMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Confirm Password *</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          style={[styles.input, styles.passwordInput]}
                          placeholder="Re-enter your password"
                          placeholderTextColor={Colors.kidsTextMuted}
                          value={confirmPassword}
                          onChangeText={(t) => {
                            setConfirmPassword(t);
                            setErrorMessage(null);
                          }}
                          secureTextEntry={!isConfirmPasswordVisible}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() =>
                            setIsConfirmPasswordVisible(
                              !isConfirmPasswordVisible
                            )
                          }
                          accessibilityLabel="Toggle confirm password visibility"
                        >
                          <MaterialIcons
                            name={
                              isConfirmPasswordVisible
                                ? 'visibility-off'
                                : 'visibility'
                            }
                            size={22}
                            color={Colors.kidsTextMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <PrimaryButton
                      label="Register & Enter Dashboard 🚀"
                      color={Colors.kidsCoral}
                      loading={isLoading}
                      onPress={handleParentRegister}
                    />

                    <TouchableOpacity
                      style={styles.backStepButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        setErrorMessage(null);
                        setRegisterStep(1);
                      }}
                    >
                      <Text style={styles.backStepText}>
                        ⬅ Back to Safety Briefing
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* --- Admin Login --- */}
            {selectedMode === AuthMode.ADMIN_LOGIN && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Admin System Sign In</Text>
                <Text style={styles.formSubtitle}>
                  Admin credentials required. Grants system-wide oversight.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Admin Username / Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter admin username"
                    placeholderTextColor={Colors.kidsTextMuted}
                    value={adminUser}
                    onChangeText={(t) => {
                      setAdminUser(t);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Admin Password *</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Admin Password"
                      placeholderTextColor={Colors.kidsTextMuted}
                      value={adminPass}
                      onChangeText={(t) => {
                        setAdminPass(t);
                        setErrorMessage(null);
                      }}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      <MaterialIcons
                        name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                        size={22}
                        color={Colors.kidsTextMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <PrimaryButton
                  label="Sign In to Admin Panel 🛡️"
                  color={Colors.kiddoDarkNavy}
                  loading={isLoading}
                  onPress={handleAdminLogin}
                />
              </View>
            )}

            {/* Error banner */}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// --- Internal Components ---

interface TabPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const TabPill: React.FC<TabPillProps> = ({ label, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.tabPill, isSelected && styles.tabPillSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text
      style={[
        styles.tabPillText,
        isSelected ? styles.tabPillTextSelected : styles.tabPillTextUnselected,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface PrimaryButtonProps {
  label: string;
  color: string;
  loading: boolean;
  onPress: () => void;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  color,
  loading,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.primaryButton, { backgroundColor: color }]}
    activeOpacity={0.85}
    onPress={onPress}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <Text style={styles.primaryButtonText}>{label}</Text>
    )}
  </TouchableOpacity>
);

// --- Styles ---
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: Colors.kidsSurface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '900',
    color: Colors.kidsTextPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 6,
    marginTop: 10,
    gap: 6,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tabPillTextSelected: {
    color: '#0F172A',
  },
  tabPillTextUnselected: {
    color: '#64748B',
    fontWeight: '600',
  },
  formSection: {
    marginTop: 18,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.kidsTextSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 22,
  },
  inputGroup: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.kidsTextPrimary,
    marginBottom: 6,
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
    color: Colors.kidsTextPrimary,
    marginTop: 6,
  },
  passwordWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 6,
  },
  passwordInput: {
    marginTop: 0,
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
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  // Step indicator styles
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 10,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: Colors.kidsSkyBlue,
  },
  stepBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  stepBadgeTextInactive: {
    color: '#64748B',
  },
  stepLine: {
    width: 48,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  stepLineActive: {
    backgroundColor: Colors.kidsSkyBlue,
  },
  // Policy brief styles
  policyBriefCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
    gap: 16,
  },
  policyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  policyPointTextWrap: {
    flex: 1,
  },
  policyPointTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.kidsTextPrimary,
    marginBottom: 3,
  },
  policyPointDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.kidsTextSecondary,
    lineHeight: 20,
  },
  policyConsentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    padding: 16,
    gap: 14,
    marginTop: 6,
  },
  policyConsentBoxActive: {
    borderColor: Colors.kidsSkyBlue,
    backgroundColor: Colors.kidsSkyBlueContainer,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCircleActive: {
    backgroundColor: Colors.kidsSkyBlue,
    borderColor: Colors.kidsSkyBlue,
  },
  policyConsentText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
    lineHeight: 19,
  },
  backStepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  backStepText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.kidsTextSecondary,
  },
  errorText: {
    color: Colors.kidsError,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },
  // PIN specific
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pinDotFilled: {
    backgroundColor: Colors.kidsCoral + '1F',
    borderColor: Colors.kidsCoral,
  },
  pinDotEmpty: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  pinDotBullet: {
    fontSize: 24,
    color: Colors.kidsCoral,
    fontWeight: '900',
  },
  keypad: {
    marginTop: 6,
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 14,
  },
  keypadButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonOk: {
    backgroundColor: Colors.kidsSkyBlue,
  },
  keypadButtonClear: {
    backgroundColor: '#E2E8F0',
  },
  keypadButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  keypadButtonTextOk: {
    color: '#FFFFFF',
  },
});