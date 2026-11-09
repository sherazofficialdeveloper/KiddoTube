// src/features/parental/ParentAuthScreen.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { KiddoTubeLogo } from '../../components/branding';
import { ScreenState } from '../../types/navigation';
import type { RootStackParamList } from '../../types/navigation';
import { useParentAdminStore } from '../../store/parentAdminStore';
import { resetToParentPanel } from '../../app/navigation/navigationRef';
import { getPrivacyPolicyUrl } from '../../app/config/env';

type ParentAuthScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.PARENT_AUTH
>;

type TabType = 'login' | 'register' | 'admin';

export const ParentAuthScreen: React.FC<ParentAuthScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const initialTab = route.params?.initialTab ?? 'login';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Password visibility
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [isAdminPassVisible, setIsAdminPassVisible] = useState(false);

  // 2-Step Registration Process
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

  // Status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Forgot password states
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotNewPassVisible, setForgotNewPassVisible] = useState(false);
  const [forgotConfirmPassVisible, setForgotConfirmPassVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loginParent = useParentAdminStore((s) => s.loginParent);
  const registerParent = useParentAdminStore((s) => s.registerParent);
  const loginAdmin = useParentAdminStore((s) => s.loginAdmin);
  const forgotPassword = useParentAdminStore((s) => s.forgotPassword);
  const resetPasswordWithOtp = useParentAdminStore((s) => s.resetPasswordWithOtp);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setForgotSuccessMessage(null);
    setIsForgotPasswordMode(false);
    if (tab === 'register') {
      setRegisterStep(1);
    }
  };

  const handleRequestOtp = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid parent email address.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setForgotSuccessMessage(null);

    const res = await forgotPassword(forgotEmail.trim());
    setIsLoading(false);
    if (res.success) {
      if (res.devOtp) {
        setForgotOtp(res.devOtp);
        setForgotSuccessMessage(`Reset code generated: ${res.devOtp} (Sent to email)`);
      } else {
        setForgotSuccessMessage('Reset code sent! Please check your email inbox.');
      }
      setForgotStep(2);
    } else {
      setErrorMessage(res.error || 'Failed to send reset code.');
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp.trim()) {
      setErrorMessage('Please enter the 6-digit code received in your email.');
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setForgotSuccessMessage(null);

    const res = await resetPasswordWithOtp(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword.trim());
    if (res.success) {
      const loginRes = await loginParent(forgotEmail.trim(), forgotNewPassword.trim());
      setIsLoading(false);
      if (loginRes.success) {
        resetToParentPanel();
      } else {
        setIsForgotPasswordMode(false);
        setErrorMessage('Password reset successfully! Please sign in with your new password.');
      }
    } else {
      setIsLoading(false);
      setErrorMessage(res.error || 'Failed to reset password. Please verify the OTP code.');
    }
  };

  const handleParentLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginParent(username.trim(), password.trim());
    setIsLoading(false);

    if (result.success) {
      resetToParentPanel();
    } else {
      setErrorMessage(result.error ?? 'Invalid parent credentials.');
    }
  };

  const handleParentRegister = async () => {
    if (!username.trim()) {
      setErrorMessage('Please choose a parent username.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid parent email address.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }
    if (!pin.trim() || !/^\d{4}$/.test(pin.trim())) {
      setErrorMessage('Please enter a 4-digit Parent Security PIN (digits only).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await registerParent(
      username.trim(),
      email.trim(),
      password.trim(),
      pin.trim()
    );
    setIsLoading(false);

    if (result.success) {
      resetToParentPanel();
    } else {
      setErrorMessage(result.error ?? 'Registration failed. Username may already exist.');
    }
  };

  const handleAdminLogin = async () => {
    if (!adminUser.trim() || !adminPass.trim()) {
      setErrorMessage('Please enter admin username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginAdmin(adminUser.trim(), adminPass.trim());
    setIsLoading(false);

    if (result.success) {
      navigation.navigate(ScreenState.ADMIN_PANEL);
    } else {
      setErrorMessage(result.error ?? 'Invalid administrator credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top App Bar with Back Arrow */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back to child login"
        >
          <MaterialIcons name="arrow-back" size={26} color="#23324A" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            const next = logoTapCount + 1;
            if (next >= 10) {
              setLogoTapCount(0);
              setActiveTab('admin');
              setIsForgotPasswordMode(false);
              setErrorMessage(null);
            } else {
              setLogoTapCount(next);
            }
          }}
          style={styles.topBarBranding}
        >
          <KiddoTubeLogo size="small" showTagline={false} />
        </TouchableOpacity>

        <View style={styles.topBarSpacer} />
      </View>

      {/* Top Tabs: Visible tabs are Parent Login and Create Parent Account */}
      <View style={styles.tabsContainer}>
        {/* Tab 1: Parent Login (Auto opened first) */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'login' && !isForgotPasswordMode && styles.tabButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => handleTabChange('login')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'login' && !isForgotPasswordMode && styles.tabTextActive,
            ]}
          >
            Parent Login
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Create Parent Account */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => handleTabChange('register')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'register' && styles.tabTextActive,
            ]}
          >
            Create Parent Account
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Admin Portal (Visible only if unlocked via 10-tap Easter egg) */}
        {activeTab === 'admin' && (
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => handleTabChange('admin')}
          >
            <Text style={[styles.tabText, styles.tabTextActive]}>
              Admin Portal 🛡️
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Screen Body */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 120, 220) },
          ]}
          scrollEnabled={activeTab === 'login' && !isForgotPasswordMode ? isKeyboardVisible : true}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success Banner */}
          {forgotSuccessMessage ? (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={22} color="#16A34A" />
              <Text style={styles.successText}>{forgotSuccessMessage}</Text>
            </View>
          ) : null}

          {/* ══════════════════════════════════════════════════════ */}
          {/* FORGOT PASSWORD MODE                                 */}
          {/* ══════════════════════════════════════════════════════ */}
          {isForgotPasswordMode ? (
            <View style={styles.card}>
              <Text style={styles.screenHeading}>
                {forgotStep === 1 ? 'Reset Password' : 'Enter Verification Code'}
              </Text>
              <Text style={styles.screenParagraph}>
                {forgotStep === 1
                  ? "Enter your registered email address and we'll send a 6-digit verification code to reset your password."
                  : `Enter the 6-digit code sent to ${forgotEmail} and set your new password.`}
              </Text>

              {forgotStep === 1 ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Parent Email</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={forgotEmail}
                        onChangeText={(t) => {
                          setForgotEmail(t);
                          setErrorMessage(null);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.primaryButtonSky}
                    activeOpacity={0.85}
                    onPress={handleRequestOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Reset Code ✉️</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>6-Digit Code</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={forgotOtp}
                        onChangeText={(t) => {
                          setForgotOtp(t);
                          setErrorMessage(null);
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { paddingRight: 48 }]}
                        value={forgotNewPassword}
                        onChangeText={(t) => {
                          setForgotNewPassword(t);
                          setErrorMessage(null);
                        }}
                        secureTextEntry={!forgotNewPassVisible}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setForgotNewPassVisible(!forgotNewPassVisible)}
                        accessibilityLabel="Toggle password visibility"
                      >
                        <MaterialIcons
                          name={forgotNewPassVisible ? 'visibility-off' : 'visibility'}
                          size={22}
                          color="#5F6E85"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { paddingRight: 48 }]}
                        value={forgotConfirmPassword}
                        onChangeText={(t) => {
                          setForgotConfirmPassword(t);
                          setErrorMessage(null);
                        }}
                        secureTextEntry={!forgotConfirmPassVisible}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setForgotConfirmPassVisible(!forgotConfirmPassVisible)}
                        accessibilityLabel="Toggle password visibility"
                      >
                        <MaterialIcons
                          name={forgotConfirmPassVisible ? 'visibility-off' : 'visibility'}
                          size={22}
                          color="#5F6E85"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.primaryButtonCoral}
                    activeOpacity={0.85}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Reset Password & Sign In 🔐</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.backStepButton}
                activeOpacity={0.7}
                onPress={() => {
                  setIsForgotPasswordMode(false);
                  setErrorMessage(null);
                  setForgotSuccessMessage(null);
                }}
              >
                <Text style={styles.backStepText}>⬅ Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'login' && (
            <View style={styles.card}>
              <Text style={styles.screenHeading}>Parent Sign In</Text>
              <Text style={styles.screenParagraph}>
                Sign in to manage kids profiles, whitelist safe YouTube channels, and set viewing time limits.
              </Text>

              {/* Input: Username or Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Parent Username or Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Input: Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.textInput, { paddingRight: 48 }]}
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
                      color="#5F6E85"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => {
                  setIsForgotPasswordMode(true);
                  setForgotStep(1);
                  setForgotEmail(username.includes('@') ? username : '');
                  setErrorMessage(null);
                  setForgotSuccessMessage(null);
                }}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Error Banner inside card right above Sign In button */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.primaryButtonCoral}
                activeOpacity={0.85}
                onPress={handleParentLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Open Parent Dashboard 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 2: PARENT REGISTRATION (2-STEP PROCESS)          */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'register' && (
            <View style={styles.card}>
              {/* Step Progress Indicator */}
              <View style={styles.stepIndicatorRow}>
                <View style={[styles.stepDot, registerStep === 1 && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, registerStep === 1 && styles.stepDotTextActive]}>1</Text>
                </View>
                <Text style={styles.stepTitleText}>Safety Briefing</Text>
                <View style={[styles.stepLine, registerStep === 2 && styles.stepLineActive]} />
                <View style={[styles.stepDot, registerStep === 2 && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, registerStep === 2 && styles.stepDotTextActive]}>2</Text>
                </View>
                <Text style={styles.stepTitleText}>Account Details</Text>
              </View>

              {/* STEP 1: SAFETY & PRIVACY BRIEFING (From HTML Prototype) */}
              {registerStep === 1 ? (
                <View>
                  <Text style={styles.screenHeading}>Before you start</Text>
                  <Text style={styles.screenSubheading}>For parents & guardians (18+)</Text>

                  {/* Policy Card 1 */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyCardTitle}>👨‍👩‍👧 Parents set up, kids enjoy</Text>
                    <Text style={styles.policyCardText}>
                      A parent or guardian must create the account, set the PIN, and supervise use. Health guidelines suggest no screen time for under 2s and up to 1 hour a day for ages 2–5.
                    </Text>
                  </View>

                  {/* Policy Card 2 */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyCardTitle}>🛡️ Only what you approve</Text>
                    <Text style={styles.policyCardText}>
                      KiddoTube has no content of its own and never recommends videos. Your child can only see the videos and channels that you add, and you are responsible for checking them first. Videos play from third-party services such as YouTube, under their terms, and may include their own ads. There are no comments, chat, sharing, or links out.
                    </Text>
                  </View>

                  {/* Policy Card 3 */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyCardTitle}>🔒 Your privacy</Text>
                    <Text style={styles.policyCardText}>
                      We collect the minimum (parent email, child nickname and age band, viewing history and the links you add). KiddoTube shows no ads of its own and does no behavioural tracking.
                    </Text>
                  </View>

                  {/* Policy Card 4 */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyCardTitle}>🚩 Reporting & help</Text>
                    <Text style={styles.policyCardText}>
                      Your child can report or hide any video and you'll be notified immediately. You choose a G or PG rating for each item.
                    </Text>
                  </View>

                  {/* Interactive Consent Checkbox */}
                  <TouchableOpacity
                    style={[
                      styles.consentBox,
                      acceptedPrivacyPolicy && styles.consentBoxActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy);
                      setErrorMessage(null);
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedPrivacyPolicy && styles.checkboxActive,
                      ]}
                    >
                      {acceptedPrivacyPolicy ? (
                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text style={styles.consentText}>
                      I am a parent/guardian aged 18+. I have read and accept the KiddoTube Family Safety Commitment & Privacy Policy.
                    </Text>
                  </TouchableOpacity>

                  {/* Public Policy Link */}
                  <TouchableOpacity
                    style={styles.viewPolicyLink}
                    activeOpacity={0.8}
                    onPress={() => {
                      const url = getPrivacyPolicyUrl();
                      Linking.openURL(url).catch((err) => {
                        console.warn('Could not open privacy policy URL:', err);
                      });
                    }}
                  >
                    <MaterialIcons name="open-in-new" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.viewPolicyLinkText}>Read full Public Privacy & Family Safety Policy (Web)</Text>
                  </TouchableOpacity>

                  {/* Step 1 Continue Button */}
                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.primaryButtonSky,
                      !acceptedPrivacyPolicy && styles.primaryButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!acceptedPrivacyPolicy) {
                        setErrorMessage(
                          'Please check the box to confirm you agree to the safety policy before continuing.'
                        );
                        return;
                      }
                      setErrorMessage(null);
                      setRegisterStep(2);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>I understand, continue (Step 2) ➔</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* STEP 2: PARENT ACCOUNT CREDENTIALS */
                <View>
                  <Text style={styles.screenHeading}>Create Parent Account</Text>
                  <Text style={styles.screenParagraph}>
                    Step 2: Enter your parent credentials. You will use these to log in, whitelist content, and control screen time.
                  </Text>

                  {/* Input: Username */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Parent Username</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={(t) => {
                          setUsername(t);
                          setErrorMessage(null);
                        }}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Input: Email */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Parent Email</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          setErrorMessage(null);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Input: Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { paddingRight: 48 }]}
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
                          color="#5F6E85"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Input: Confirm Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { paddingRight: 48 }]}
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
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                        accessibilityLabel="Toggle confirm password visibility"
                      >
                        <MaterialIcons
                          name={isConfirmPasswordVisible ? 'visibility-off' : 'visibility'}
                          size={22}
                          color="#5F6E85"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Input: 4-Digit Parent Security PIN */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>4-Digit Parent Security PIN *</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { paddingRight: 48 }]}
                        value={pin}
                        onChangeText={(t) => {
                          const digitsOnly = t.replace(/[^0-9]/g, '').slice(0, 4);
                          setPin(digitsOnly);
                          setErrorMessage(null);
                        }}
                        placeholder="e.g. 1234"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={!isPinVisible}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setIsPinVisible(!isPinVisible)}
                        accessibilityLabel="Toggle PIN visibility"
                      >
                        <MaterialIcons
                          name={isPinVisible ? 'visibility-off' : 'visibility'}
                          size={22}
                          color="#5F6E85"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Complete Button */}
                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.primaryButtonCoral}
                    activeOpacity={0.85}
                    onPress={handleParentRegister}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Complete Registration 🚀</Text>
                    )}
                  </TouchableOpacity>

                  {/* Back to Step 1 Button */}
                  <TouchableOpacity
                    style={styles.backStepButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      setErrorMessage(null);
                      setRegisterStep(1);
                    }}
                  >
                    <Text style={styles.backStepText}>⬅ Back to Safety Briefing</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 3: ADMIN LOGIN                                   */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'admin' && (
            <View style={styles.card}>
              <Text style={styles.screenHeading}>Administrator Portal</Text>
              <Text style={styles.screenParagraph}>
                Admin system credentials required. Grants system-wide oversight, parent accounts view, and video catalog governance.
              </Text>

              {/* Input: Admin Username */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Admin Username / Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={adminUser}
                    onChangeText={(t) => {
                      setAdminUser(t);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Input: Admin Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.textInput, { paddingRight: 48 }]}
                    value={adminPass}
                    onChangeText={(t) => {
                      setAdminPass(t);
                      setErrorMessage(null);
                    }}
                    secureTextEntry={!isAdminPassVisible}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setIsAdminPassVisible(!isAdminPassVisible)}
                    accessibilityLabel="Toggle admin password visibility"
                  >
                    <MaterialIcons
                      name={isAdminPassVisible ? 'visibility-off' : 'visibility'}
                      size={22}
                      color="#5F6E85"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Admin Button */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.primaryButtonAdmin}
                activeOpacity={0.85}
                onPress={handleAdminLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In to Admin Console 🛡️</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF9EC', // Prototype: --bg: #FFF9EC
  },
  keyboardAvoid: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFC93C', // Prototype: --y: #FFC93C
    borderBottomWidth: 2,
    borderBottomColor: '#EADFC8',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topBarBranding: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 44,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#EADFC8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9EC',
    borderWidth: 2,
    borderColor: '#EADFC8',
  },
  tabButtonActive: {
    backgroundColor: '#3A9BE8', // Prototype: --b: #3A9BE8
    borderColor: '#3A9BE8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5F6E85', // Prototype: --mute: #5f6e85
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF', // Prototype: --card: #fff
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#EADFC8', // Prototype: --line: #eadfc8
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
    textAlign: 'center',
  },
  screenSubheading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  screenParagraph: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
    lineHeight: 19,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    lineHeight: 19,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    marginBottom: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  // Inputs Styled After User Pattern
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#EADFC8',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    position: 'relative',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 10,
    lineHeight: 22,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Buttons
  primaryButtonCoral: {
    backgroundColor: '#FF6F61', // Prototype: --c: #FF6F61
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#FF6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonSky: {
    backgroundColor: '#3A9BE8', // Prototype: --b: #3A9BE8
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#3A9BE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonAdmin: {
    backgroundColor: '#1E293B',
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  backStepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  backStepText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5F6E85',
  },
  // Step Indicator
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF9EC',
    borderWidth: 2,
    borderColor: '#EADFC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#3A9BE8',
    borderColor: '#3A9BE8',
  },
  stepDotText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#5F6E85',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 36,
    height: 3,
    backgroundColor: '#EADFC8',
  },
  stepLineActive: {
    backgroundColor: '#3A9BE8',
  },
  stepTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  // Policy Cards from HTML Prototype
  policyCard: {
    backgroundColor: '#EAF4FD', // Prototype: --pbg: #EAF4FD
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EADFC8',
    padding: 16,
    marginBottom: 12,
  },
  policyCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
  },
  policyCardText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#000000',
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EADFC8',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  consentBoxActive: {
    borderColor: '#3A9BE8',
    backgroundColor: '#F0F9FF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8C9EAE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#3A9BE8',
    borderColor: '#3A9BE8',
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#000000',
  },
  viewPolicyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  viewPolicyLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    textDecorationLine: 'underline',
  },
});

