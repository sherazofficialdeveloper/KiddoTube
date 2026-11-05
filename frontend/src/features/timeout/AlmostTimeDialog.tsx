// src/features/timeout/AlmostTimeDialog.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';

/**
 * AlmostTimeDialog
 * Migrated 1:1 from Kotlin AlmostTimeDialog.kt
 * 
 * Shown when remaining time ≤ 5 min. "Continue Watching 👍" dismisses it.
 */

interface AlmostTimeDialogProps {
  visible: boolean;
  minutesRemaining: number;
  onDismiss: () => void;
}

export const AlmostTimeDialog: React.FC<AlmostTimeDialogProps> = ({
  visible,
  minutesRemaining,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Hourglass icon */}
          <View style={styles.iconCircle}>
            <MaterialIcons
              name="hourglass-bottom"
              size={36}
              color={Colors.kidsSunnyYellow}
            />
          </View>

          <Text style={styles.title}>Almost Time!</Text>

          <Text style={styles.body}>
            You have {minutesRemaining} minutes left for today.{'\n'}
            Finish your current video!
          </Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={onDismiss}
            testID="continue_watching_button"
          >
            <Text style={styles.buttonText}>
              Continue Watching 👍
            </Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.kidsSurface,
    borderRadius: Dimensions.radiusLarge,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.kidsSunnyYellow + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headlineLarge,
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
    marginTop: Dimensions.spaceMedium,
  },
  body: {
    ...Typography.bodyLarge,
    color: Colors.kidsTextSecondary,
    textAlign: 'center',
    marginTop: Dimensions.spaceSmall,
  },
  button: {
    width: '100%',
    height: Dimensions.touchTargetMin,
    borderRadius: Dimensions.radiusPill,
    backgroundColor: Colors.kidsPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Dimensions.spaceLarge,
  },
  buttonText: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});