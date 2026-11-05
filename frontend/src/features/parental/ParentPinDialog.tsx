// src/features/parental/ParentPinDialog.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import type { PinVerificationResult } from '../../store/screenTimeStore';
import { KiddoTubeLogo } from '../../components/branding';

/**
 * ParentPinDialog
 * Migrated 1:1 from Kotlin ParentPinDialog.kt
 * 
 * 4-digit PIN entry with numeric keypad, masked dots, lockout handling
 */

interface ParentPinDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onVerifyPin: (pin: string) => Promise<PinVerificationResult>;
  onPinSuccess: (remainingMinutes: number, timeUsedMinutes: number) => void;
}

export const ParentPinDialog: React.FC<ParentPinDialogProps> = ({
  visible,
  onDismiss,
  onVerifyPin,
  onPinSuccess,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const addDigit = async (digit: string) => {
    if (enteredPin.length >= 4) return;

    const updated = enteredPin + digit;
    setEnteredPin(updated);
    setErrorMessage(null);

    if (updated.length === 4) {
      setIsChecking(true);
      try {
        const result = await onVerifyPin(updated);
        setIsChecking(false);

        if (result.type === 'SUCCESS') {
          onPinSuccess(result.remainingMinutes, result.totalTimeUsed);
          setEnteredPin('');
        } else if (result.type === 'ERROR') {
          setErrorMessage(
            `${result.message} (${result.attemptsLeft} tries left)`
          );
          setEnteredPin('');
        } else if (result.type === 'LOCKED_OUT') {
          setErrorMessage(
            `Too many failed attempts. Locked for ${result.lockoutSecondsRemaining}s.`
          );
          setEnteredPin('');
        }
      } catch {
        setIsChecking(false);
        setErrorMessage('Verification failed. Please try again.');
        setEnteredPin('');
      }
    }
  };

  const removeDigit = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const handleClose = () => {
    setEnteredPin('');
    setErrorMessage(null);
    onDismiss();
  };

  // Keypad layout: 1-9, empty, 0, DEL
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'DEL'],
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} testID="parent_pin_dialog">
          <View style={styles.logoWrap}>
            <KiddoTubeLogo size="small" showTagline={false} />
          </View>
          {/* Top row: lock + title + close */}
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              <View style={styles.lockIconCircle}>
                <MaterialIcons
                  name="lock"
                  size={18}
                  color={Colors.kidsSkyBlue}
                />
              </View>
              <Text style={[Typography.titleMedium, styles.titleText]}>
                Parental Access
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
            >
              <MaterialIcons
                name="close"
                size={22}
                color={Colors.kidsTextMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <Text style={[Typography.headlineMedium, styles.heading]}>
            Enter 4-Digit Parent PIN
          </Text>
          <Text style={[Typography.labelSmall, styles.subheading]}>
            Default verification PIN is 1234
          </Text>

          {/* PIN dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => {
              const isFilled = i < enteredPin.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isFilled
                        ? Colors.kidsPrimary
                        : '#E2E8F0',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Error */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* Loading */}
          {isChecking ? (
            <ActivityIndicator
              size="small"
              color={Colors.kidsPrimary}
              style={styles.loader}
            />
          ) : null}

          {/* Keypad */}
          <View style={styles.keypad}>
            {keypadRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) => {
                  if (key === '') {
                    return (
                      <View key={keyIndex} style={styles.keypadSpacer} />
                    );
                  }
                  if (key === 'DEL') {
                    return (
                      <TouchableOpacity
                        key={keyIndex}
                        style={styles.keypadButton}
                        activeOpacity={0.7}
                        onPress={removeDigit}
                      >
                        <MaterialIcons
                          name="backspace"
                          size={24}
                          color={Colors.kidsTextPrimary}
                        />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={[styles.keypadButton, styles.keypadButtonFilled]}
                      activeOpacity={0.7}
                      onPress={() => addDigit(key)}
                      testID={`keypad_digit_${key}`}
                    >
                      <Text style={styles.keypadDigit}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.kidsSurface,
    borderRadius: Dimensions.radiusLarge,
    padding: Dimensions.spaceLarge,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Dimensions.spaceMedium,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.kidsSkyBlue + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: Colors.kidsTextPrimary,
    marginLeft: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
    marginTop: Dimensions.spaceMedium,
  },
  subheading: {
    color: Colors.kidsTextMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: Dimensions.spaceLarge,
    gap: 18,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.kidsError,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  loader: {
    marginTop: 16,
  },
  keypad: {
    marginTop: Dimensions.spaceLarge,
    width: '100%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
  },
  keypadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonFilled: {
    backgroundColor: '#F1F5F9',
  },
  keypadSpacer: {
    width: 60,
    height: 60,
  },
  keypadDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
  },
});