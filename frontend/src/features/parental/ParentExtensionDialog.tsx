// src/features/parental/ParentExtensionDialog.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

/**
 * ParentExtensionDialog
 * Migrated 1:1 from Kotlin ParentExtensionDialog.kt
 * 
 * "Set time limits" dialog with slider (5-90 minutes)
 * Triggered after parent unlocks timeout
 */

interface ParentExtensionDialogProps {
  visible: boolean;
  timeUsedMinutes?: number;
  timeRemainingMinutes?: number;
  onDismiss: () => void;
  onConfirmExtension: (extensionMinutes: number) => void;
}

export const ParentExtensionDialog: React.FC<ParentExtensionDialogProps> = ({
  visible,
  onDismiss,
  onConfirmExtension,
}) => {
  const [extensionMinutes, setExtensionMinutes] = useState(30);

  const handleClose = () => {
    setExtensionMinutes(30);
    onDismiss();
  };

  const handleConfirm = () => {
    onConfirmExtension(Math.round(extensionMinutes));
  };

  const decrease = () => {
    setExtensionMinutes((prev) => Math.max(5, prev - 5));
  };

  const increase = () => {
    setExtensionMinutes((prev) => Math.min(90, prev + 5));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} testID="parent_extension_dialog">
          {/* Header */}
          <View style={styles.header}>
            <Text style={[Typography.titleLarge, styles.title]}>
              Set time limits
            </Text>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons
                name="close"
                size={22}
                color={Colors.kidsTextMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[Typography.bodyMedium, styles.subtitle]}>
            When time is up, the app will lock.
          </Text>

          {/* Stepper + Slider */}
          <View style={styles.sliderRow}>
            <TouchableOpacity
              onPress={decrease}
              style={styles.stepButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="remove-circle-outline"
                size={26}
                color={Colors.kidsTextSecondary}
              />
            </TouchableOpacity>

            <Slider
              style={styles.slider}
              value={extensionMinutes}
              onValueChange={setExtensionMinutes}
              minimumValue={5}
              maximumValue={90}
              step={5}
              minimumTrackTintColor={Colors.kidsSkyBlue}
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor={Colors.kidsSkyBlue}
            />

            <TouchableOpacity
              onPress={increase}
              style={styles.stepButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="add-circle-outline"
                size={26}
                color={Colors.kidsTextSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Big minutes display */}
          <Text style={styles.bigMinutes}>
            {Math.round(extensionMinutes)} minutes
          </Text>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.confirmButton}
              activeOpacity={0.85}
              testID="start_timer_button"
            >
              <Text style={styles.confirmText}>START TIMER</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.kidsSurface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: Colors.kidsTextSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  stepButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  bigMinutes: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.kidsSkyBlue,
    textAlign: 'center',
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 28,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    ...Typography.labelLarge,
    color: Colors.kidsTextSecondary,
    fontWeight: '700',
  },
  confirmButton: {
    marginLeft: 12,
    backgroundColor: '#E52042',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});