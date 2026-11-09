// src/features/parent-dashboard/dialogs/AddChildDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../../components/ui/FontText';

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Typography } from '../../../theme/typography';
import { hexLongToColor } from '../../../utils/color';
import { Api } from '../../../services/api';
import {
  CHILD_AGE_BANDS,
  CHILD_AVATAR_COLORS,
  CHILD_AVATARS,
} from '../../../constants/childProfiles';

interface AddChildDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (
    username: string,
    displayName: string,
    password: string,
    avatarEmoji: string,
    colorHex: number,
    ageGroup: number
  ) => Promise<{ success: boolean; error?: string }>;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export const AddChildDialog: React.FC<AddChildDialogProps> = ({
  visible,
  onDismiss,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(CHILD_AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(CHILD_AVATAR_COLORS[0]);
  const [ageGroup, setAgeGroup] = useState<number>(CHILD_AGE_BANDS[1].ageGroup);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GitHub-style Real-time username check state
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setIsPasswordVisible(false);
    setSelectedEmoji(CHILD_AVATARS[0]);
    setSelectedColor(CHILD_AVATAR_COLORS[0]);
    setAgeGroup(CHILD_AGE_BANDS[1].ageGroup);
    setErrorMessage(null);
    setUsernameStatus('idle');
    setUsernameFeedback('');
    setIsCreating(false);
    onDismiss();
  };

  // GitHub-style real-time username availability check
  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setErrorMessage(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = text.trim();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameFeedback('');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('idle');
      setUsernameFeedback('Username must be at least 3 characters');
      return;
    }

    setUsernameStatus('checking');
    setUsernameFeedback('Checking username availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await Api.checkChildUsername(clean);
        if (res.success && res.available) {
          setUsernameStatus('available');
          setUsernameFeedback('Username is available! ✓');
        } else {
          setUsernameStatus('taken');
          setUsernameFeedback(res.message || 'Username is already taken. Choose another.');
        }
      } catch {
        setUsernameStatus('error');
        setUsernameFeedback('Could not verify this username. Check your connection and try again.');
      }
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleCreate = async () => {
    if (isCreating) return;

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter a username for your child! 🎈');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage('Username is already taken! Please choose a different username.');
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('Please enter a password for this child account! 🔑');
      return;
    }

    if (trimmedPass.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const resolvedDisplayName = displayName.trim() || trimmedUser;
      const result = await onConfirm(
        trimmedUser,
        resolvedDisplayName,
        trimmedPass,
        selectedEmoji,
        selectedColor,
        ageGroup
      );

      if (result.success) {
        handleClose();
      } else {
        setErrorMessage(result.error ?? 'Unable to create child profile.');
        setIsCreating(false);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create child profile.'
      );
      setIsCreating(false);
    }
  };

  const isSubmitDisabled =
    isCreating ||
    usernameStatus === 'taken' ||
    usernameStatus === 'error' ||
    usernameStatus === 'checking' ||
    !username.trim() ||
    !password.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="add_child_dialog"
    >
      <View style={[styles.backdrop, { paddingTop: Math.max(insets.top + 16, 24), paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <View style={styles.dialog}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Add Child</Text>
              <Text style={styles.subtitle}>
                Set name, password, and pick an avatar
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Live Avatar Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewCircle,
                  { backgroundColor: hexLongToColor(selectedColor) },
                ]}
              >
                <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              </View>
              <Text style={styles.previewLabel}>
                {displayName.trim() || username.trim() || 'New Child'}
              </Text>
            </View>

            {/* Child Username with Label + Real-time Check */}
            <View style={styles.fieldBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Child Username *</Text>
                {usernameStatus === 'checking' && (
                  <ActivityIndicator size="small" color="#0284C7" />
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  usernameStatus === 'available' && styles.inputSuccess,
                  usernameStatus === 'taken' && styles.inputError,
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. kiddo_star"
                placeholderTextColor="#94A3B8"
              />
              {/* Live GitHub-style Feedback message */}
              {usernameFeedback ? (
                <View style={styles.feedbackRow}>
                  <MaterialIcons
                    name={
                      usernameStatus === 'available'
                        ? 'check-circle'
                        : usernameStatus === 'taken'
                        ? 'cancel'
                        : 'info'
                    }
                    size={14}
                    color={
                      usernameStatus === 'available'
                        ? '#059669'
                        : usernameStatus === 'taken'
                        ? '#DC2626'
                        : '#64748B'
                    }
                  />
                  <Text
                    style={[
                      styles.feedbackText,
                      usernameStatus === 'available' && styles.feedbackSuccess,
                      usernameStatus === 'taken' && styles.feedbackError,
                    ]}
                  >
                    {usernameFeedback}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Display Name with Label */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ali or Sheraz (Optional)"
                placeholderTextColor="#94A3B8"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            {/* Child Password with Label */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>Password</Text>
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

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Age Group */}
            <Text style={styles.sectionLabel}>Age group:</Text>
            <View style={styles.ageBandRow}>
              {CHILD_AGE_BANDS.map((band) => {
                const selected = ageGroup === band.ageGroup;
                return (
                  <TouchableOpacity
                    key={band.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.ageBand, selected && styles.ageBandSelected]}
                    onPress={() => setAgeGroup(band.ageGroup)}
                  >
                    <Text
                      style={[
                        styles.ageBandText,
                        selected && styles.ageBandTextSelected,
                      ]}
                    >
                      {band.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Avatar Background Color:</Text>
            <View style={styles.colorRow}>
              {CHILD_AVATAR_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: hexLongToColor(color) },
                      isSelected && styles.colorCircleSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {isSelected && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Avatar Emoji Selector */}
            <Text style={styles.sectionLabel}>Select Avatar Character:</Text>
            <View style={styles.emojiGrid}>
              {CHILD_AVATARS.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      isSelected && styles.emojiButtonSelected,
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Dialog Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isSubmitDisabled && styles.confirmButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={isSubmitDisabled}
              accessibilityRole="button"
              testID="create_child_button"
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Add Child</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    ...Typography.titleLarge,
    color: '#0F172A',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  previewCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  previewEmoji: {
    fontSize: 34,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  fieldBlock: {
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  inputSuccess: {
    borderColor: '#3A9BE8',
    backgroundColor: '#F0F9FF',
  },
  inputError: {
    borderColor: '#FF6F61',
    backgroundColor: '#FFF5F5',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  feedbackText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  feedbackSuccess: {
    color: '#0284C7',
  },
  feedbackError: {
    color: '#FF6F61',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginTop: 14,
    marginBottom: 8,
  },
  ageBandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageBand: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  ageBandSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  ageBandText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  ageBandTextSelected: {
    color: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0284C7',
    transform: [{ scale: 1.08 }],
  },
  emojiText: {
    fontSize: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.65,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});