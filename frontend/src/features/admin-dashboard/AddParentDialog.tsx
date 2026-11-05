// src/features/admin-dashboard/AddParentDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Typography } from '../../theme/typography';

interface AddParentDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    dailyLimitMinutes?: number;
    pin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const AddParentDialog: React.FC<AddParentDialogProps> = ({
  visible,
  onDismiss,
  onConfirm,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    setIsSubmitting(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onDismiss();
  };

  const handleSubmit = async () => {
    const cleanUser = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanUser) {
      setErrorMessage('Please enter a username for the parent account.');
      return;
    }
    if (cleanUser.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Please enter an email address.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (cleanPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onConfirm({
        username: cleanUser,
        email: cleanEmail,
        password: cleanPass,
      });

      if (result.success) {
        handleClose();
      } else {
        setErrorMessage(result.error ?? 'Failed to create parent account.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="add_parent_dialog"
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Parent Account</Text>
              <Text style={styles.subtitle}>
                Register a new parent credentials profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
          >
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parent Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parent Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
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
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  accessibilityLabel="Toggle password visibility"
                >
                  <MaterialIcons
                    name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!isConfirmPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  accessibilityLabel="Toggle confirm password visibility"
                >
                  <MaterialIcons
                    name={isConfirmPasswordVisible ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>Create Parent Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    ...Typography.titleLarge,
    color: '#000000',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
