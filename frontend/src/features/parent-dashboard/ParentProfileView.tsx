// src/features/parent-dashboard/ParentProfileView.tsx
import React, { useEffect, useState } from 'react';
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { ParentAccountDto } from '../../types/api';
import { getPrivacyPolicyUrl } from '../../app/config/env';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface ParentProfileViewProps {
  account: ParentAccountDto | null;
  onSaveProfile: (username: string, email: string) => Promise<ActionResult>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<ActionResult>;
}

export const ParentProfileView: React.FC<ParentProfileViewProps> = ({
  account,
  onSaveProfile,
  onChangePassword,
}) => {
  const [username, setUsername] = useState(account?.username ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setUsername(account?.username ?? '');
    setEmail(account?.email ?? '');
  }, [account?.email, account?.username]);

  const saveProfile = async () => {
    if (!username.trim() || !email.trim()) {
      Alert.alert('Missing details', 'Enter a username and email address.');
      return;
    }
    setIsSaving(true);
    const result = await onSaveProfile(username.trim(), email.trim());
    setIsSaving(false);
    Alert.alert(
      result.success ? 'Profile updated' : 'Could not update profile',
      result.success
        ? 'Your username and email have been saved.'
        : result.error ?? 'Please try again.'
    );
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing password', 'Enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Confirm the new password again.');
      return;
    }

    setIsSaving(true);
    const result = await onChangePassword(currentPassword, newPassword);
    setIsSaving(false);
    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    Alert.alert(
      result.success ? 'Password updated' : 'Could not change password',
      result.success
        ? 'Your new password is active.'
        : result.error ?? 'Please try again.'
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Details Card */}
      <View style={styles.card}>
        <View style={styles.heading}>
          <MaterialIcons name="account-circle" size={24} color="#0284C7" />
          <Text style={styles.title}>Profile Details</Text>
        </View>
        <Text style={styles.help}>
          Update the username and email used for your parent account.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={saveProfile}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password Card */}
      <View style={styles.card}>
        <View style={styles.heading}>
          <MaterialIcons name="lock" size={24} color="#0284C7" />
          <Text style={styles.title}>Change Password</Text>
        </View>
        <Text style={styles.help}>
          Keep your parent account secure by updating your secret password.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPass}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowCurrentPass(!showCurrentPass)}
              accessibilityLabel="Toggle current password visibility"
            >
              <MaterialIcons
                name={showCurrentPass ? 'visibility-off' : 'visibility'}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPass(!showNewPass)}
              accessibilityLabel="Toggle new password visibility"
            >
              <MaterialIcons
                name={showNewPass ? 'visibility-off' : 'visibility'}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPass}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPass(!showConfirmPass)}
              accessibilityLabel="Toggle confirm password visibility"
            >
              <MaterialIcons
                name={showConfirmPass ? 'visibility-off' : 'visibility'}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.passwordButton]}
          onPress={savePassword}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>Update Password</Text>
        </TouchableOpacity>
      </View>

      {/* Safety & Policy Card (Google Play & Family Safety) */}
      <View style={styles.card}>
        <View style={styles.heading}>
          <MaterialIcons name="security" size={24} color="#0284C7" />
          <Text style={styles.title}>Safety & Privacy Policy</Text>
        </View>
        <Text style={styles.help}>
          KiddoTube is 100% compliant with COPPA, GDPR-K, and Google Play Families guidelines. We enforce zero behavioral tracking, zero commercial ads, strict parent whitelisting, and secure data handling.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.policyButton]}
          activeOpacity={0.85}
          onPress={() => {
            const url = getPrivacyPolicyUrl();
            Linking.openURL(url).catch((err) => {
              console.warn('Could not open privacy policy URL:', err);
            });
          }}
        >
          <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>View Public Privacy Policy (Web)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  help: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  button: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  passwordButton: {
    backgroundColor: '#E5641C',
  },
  policyButton: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
