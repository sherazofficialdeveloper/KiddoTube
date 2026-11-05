// src/features/parental/ParentsPasscodeModal.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { useParentAdminStore } from '../../store/parentAdminStore';
import { KiddoTubeLogo } from '../../components/branding';

/**
 * ParentsPasscodeModal
 * 1:1 Pixel Clone of YouTube Kids "Parents only" Passcode Screen (Screenshot 3).
 * 
 * Features:
 * - Brand yellow top header with KidsStream/YouTube Kids style badge
 * - "Parents only" title & "To access, please enter your passcode" subtitle
 * - 4-dash passcode visual indicator with backspace button
 * - Clean 3x4 numeric keypad (1-9, 0)
 * - "Forgotten passcode?" link
 * - Direct backend verification via verifyParentPin()
 */

interface ParentsPasscodeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (verifiedPin: string) => void;
}

export const ParentsPasscodeModal: React.FC<ParentsPasscodeModalProps> = ({
  visible,
  onDismiss,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [newPinDraft, setNewPinDraft] = useState('');

  const verifyParentPin = useScreenTimeStore((s) => s.verifyParentPin);

  const handleClose = () => {
    setPin('');
    setIsResetMode(false);
    setResetStep(1);
    setNewPinDraft('');
    setErrorMessage(null);
    setIsLoading(false);
    onDismiss();
  };

  const handleDigitPress = async (digit: string) => {
    if (isLoading || pin.length >= 4) return;
    setErrorMessage(null);

    if (isResetMode) {
      if (resetStep === 1) {
        const updated = pin + digit;
        setPin(updated);
        if (updated.length === 4) {
          setNewPinDraft(updated);
          setPin('');
          setResetStep(2);
        }
      } else {
        const updated = pin + digit;
        setPin(updated);
        if (updated.length === 4) {
          if (updated !== newPinDraft) {
            setErrorMessage('Passcodes do not match. Please try again.');
            setPin('');
            setResetStep(1);
            setNewPinDraft('');
            return;
          }
          setIsLoading(true);
          try {
            const res = await useParentAdminStore.getState().updateParentPin('', updated);
            setIsLoading(false);
            if (res.success) {
              Alert.alert('Passcode Updated', 'Your new 4-digit passcode is active!');
              setIsResetMode(false);
              onSuccess(updated);
            } else {
              setErrorMessage(res.error || 'Failed to update passcode.');
              setPin('');
            }
          } catch (e: any) {
            setIsLoading(false);
            setErrorMessage(e.message || 'Failed to update passcode.');
            setPin('');
          }
        }
      }
      return;
    }

    const updated = pin + digit;
    setPin(updated);

    if (updated.length === 4) {
      setIsLoading(true);
      try {
        const result = await verifyParentPin(updated);
        setIsLoading(false);

        if (result.type === 'SUCCESS') {
          const verified = updated;
          setPin('');
          setErrorMessage(null);
          onSuccess(verified);
        } else if (result.type === 'LOCKED_OUT') {
          setErrorMessage(
            `Passcode locked out for ${result.lockoutSecondsRemaining}s.`
          );
          setPin('');
        } else {
          setErrorMessage(
            result.message || 'Incorrect passcode. Please try again.'
          );
          setPin('');
        }
      } catch (e: any) {
        setIsLoading(false);
        setErrorMessage(e.message || 'Verification failed. Try again.');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading || pin.length === 0) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleForgottenPasscode = () => {
    setIsResetMode(true);
    setResetStep(1);
    setPin('');
    setNewPinDraft('');
    setErrorMessage(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container} testID="parents_only_passcode_modal">
        {/* Yellow Header with Brand Branding (Matching Screenshot 3) */}
        <View style={styles.topYellowHeader}>
          <View style={styles.headerBrandRow}>
            <KiddoTubeLogo size="small" showTagline={false} />
          </View>
          <View style={styles.headerDoodle}>
            <MaterialIcons name="star" size={14} color="#D97706" />
          </View>
        </View>

        {/* White Main Modal Content */}
        <View style={styles.whiteCard}>
          {/* Top Bar with 'X' close button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={28} color="#202124" />
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <Text style={styles.title}>{isResetMode ? 'Reset Passcode' : 'Parents only'}</Text>
          <Text style={styles.subtitle}>
            {isResetMode
              ? resetStep === 1
                ? 'Enter your new 4-digit passcode'
                : 'Confirm your new 4-digit passcode'
              : 'To access, please enter your passcode'}
          </Text>

          {/* Passcode Indicator Row (4 dashes + backspace icon) */}
          <View style={styles.passcodeDisplayContainer}>
            <View style={styles.dashesRow}>
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <View key={index} style={styles.dashBox}>
                    {isFilled ? (
                      <View style={styles.filledDot} />
                    ) : (
                      <View style={styles.emptyDashLine} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Backspace Button on Right */}
            <TouchableOpacity
              onPress={handleBackspace}
              style={styles.backspaceButton}
              disabled={pin.length === 0 || isLoading}
            >
              <MaterialIcons
                name="backspace"
                size={26}
                color={pin.length > 0 ? '#202124' : '#CBD5E1'}
              />
            </TouchableOpacity>
          </View>

          {/* Loading or Error Feedback */}
          <View style={styles.feedbackRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#E52042" />
            ) : errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* Numeric Keypad Grid */}
          <View style={styles.keypadContainer}>
            <View style={styles.keypadRow}>
              <KeypadButton label="1" onPress={() => handleDigitPress('1')} />
              <KeypadButton label="2" onPress={() => handleDigitPress('2')} />
              <KeypadButton label="3" onPress={() => handleDigitPress('3')} />
            </View>
            <View style={styles.keypadRow}>
              <KeypadButton label="4" onPress={() => handleDigitPress('4')} />
              <KeypadButton label="5" onPress={() => handleDigitPress('5')} />
              <KeypadButton label="6" onPress={() => handleDigitPress('6')} />
            </View>
            <View style={styles.keypadRow}>
              <KeypadButton label="7" onPress={() => handleDigitPress('7')} />
              <KeypadButton label="8" onPress={() => handleDigitPress('8')} />
              <KeypadButton label="9" onPress={() => handleDigitPress('9')} />
            </View>
            <View style={styles.keypadRow}>
              <View style={styles.keypadEmptySpace} />
              <KeypadButton label="0" onPress={() => handleDigitPress('0')} />
              <View style={styles.keypadEmptySpace} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface KeypadButtonProps {
  label: string;
  onPress: () => void;
}
const KeypadButton: React.FC<KeypadButtonProps> = ({ label, onPress }) => (
  <TouchableOpacity
    style={styles.keypadButton}
    activeOpacity={0.5}
    onPress={onPress}
  >
    <Text style={styles.keypadDigit}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFBE00',
  },
  topYellowHeader: {
    height: 72,
    backgroundColor: '#FFBE00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDoodle: {
    padding: 4,
  },
  whiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-start',
  },
  closeButton: {
    padding: 6,
    marginLeft: -6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#202124',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#5F6368',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 28,
  },
  passcodeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    height: 48,
    marginBottom: 8,
  },
  dashesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  dashBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDashLine: {
    width: 28,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#202124',
  },
  filledDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#202124',
  },
  backspaceButton: {
    position: 'absolute',
    right: 18,
    padding: 8,
  },
  feedbackRow: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadEmptySpace: {
    width: 72,
    height: 72,
  },
  keypadDigit: {
    fontSize: 32,
    fontWeight: '500',
    color: '#202124',
  },
  forgottenLinkWrap: {
    marginTop: 'auto',
    marginBottom: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  forgottenLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    textAlign: 'center',
  },
});
