// src/features/parent-dashboard/ParentPinManagementView.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ParentPinManagementViewProps {
  onUpdatePin: (currentPin: string, newPin: string) => Promise<any> | void;
}

export const ParentPinManagementView: React.FC<ParentPinManagementViewProps> = ({
  onUpdatePin,
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPin.length !== 4) {
      setErrText('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setErrText('New PIN and confirmation do not match');
      return;
    }
    setIsSaving(true);
    setErrText(null);
    try {
      await onUpdatePin('', newPin);
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Security PIN Updated', 'Your new 4-digit PIN has been set successfully!');
    } catch (e: any) {
      setErrText(e.message || 'Failed to update PIN');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="vpn-key" size={24} color="#0284C7" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Set or Reset Security PIN</Text>
            <Text style={styles.cardSubtitle}>
              Protect parental controls and time extensions
            </Text>
          </View>
        </View>

        <Text style={styles.explanation}>
          Enter a new 4-digit PIN below. You can change or reset your PIN at any time without entering your old PIN.
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.inputLabel}>New 4-Digit PIN</Text>
          <View style={styles.pinWrap}>
            <TextInput
              style={[styles.input, styles.pinInput]}
              value={newPin}
              onChangeText={(t) => {
                setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                setErrText(null);
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={!showNewPin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowNewPin(!showNewPin)}
              accessibilityLabel="Toggle new PIN visibility"
            >
              <MaterialIcons
                name={showNewPin ? 'visibility-off' : 'visibility'}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.inputLabel}>Confirm New 4-Digit PIN</Text>
          <View style={styles.pinWrap}>
            <TextInput
              style={[styles.input, styles.pinInput]}
              value={confirmPin}
              onChangeText={(t) => {
                setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                setErrText(null);
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={!showConfirmPin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPin(!showConfirmPin)}
              accessibilityLabel="Toggle confirm PIN visibility"
            >
              <MaterialIcons
                name={showConfirmPin ? 'visibility-off' : 'visibility'}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {errText ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{errText}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          <MaterialIcons name="check" size={20} color="#FFFFFF" />
          <Text style={styles.submitText}>
            {isSaving ? 'Saving PIN...' : 'Save New PIN Directly'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  explanation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  pinWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 4,
  },
  pinInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
