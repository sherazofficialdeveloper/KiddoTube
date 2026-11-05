// src/features/parent-dashboard/ParentAppearanceView.tsx
import React, { useEffect, useState } from 'react';
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeMode } from '../../store/themeStore';

export const ParentAppearanceView: React.FC = () => {
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const appearanceScheduleEnabled = useThemeStore(
    (state) => state.appearanceScheduleEnabled
  );
  const setAppearanceScheduleEnabled = useThemeStore(
    (state) => state.setAppearanceScheduleEnabled
  );

  const darkModeStart = useThemeStore((state) => state.darkModeStart);
  const setDarkModeStart = useThemeStore((state) => state.setDarkModeStart);

  const lightModeStart = useThemeStore((state) => state.lightModeStart);
  const setLightModeStart = useThemeStore((state) => state.setLightModeStart);
  const eyeBreakEnabled = useThemeStore((state) => state.eyeBreakEnabled);
  const toggleEyeBreak = useThemeStore((state) => state.toggleEyeBreak);

  const [darkModeStartDraft, setDarkModeStartDraft] = useState(darkModeStart);
  const [lightModeStartDraft, setLightModeStartDraft] = useState(lightModeStart);

  useEffect(() => {
    setDarkModeStartDraft(darkModeStart);
    setLightModeStartDraft(lightModeStart);
  }, [darkModeStart, lightModeStart]);

  const saveScheduleTime = (
    value: string,
    fallbackValue: string,
    otherValue: string,
    save: (time: string) => void,
    restore: (time: string) => void
  ) => {
    const normalized = value.trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      restore(fallbackValue);
      Alert.alert('Invalid time', 'Please enter a valid 24-hour time, e.g. 20:00.');
      return;
    }
    if (normalized === otherValue) {
      restore(fallbackValue);
      Alert.alert('Times must differ', 'Dark mode and light mode need different start times.');
      return;
    }
    save(normalized);
  };

  const THEME_OPTIONS: Array<{
    mode: ThemeMode;
    label: string;
    description: string;
    icon: string;
    badgeColor: string;
  }> = [
    {
      mode: 'light',
      label: 'Light Mode',
      description: 'Bright and energetic warm theme for daytime watching.',
      icon: 'wb-sunny',
      badgeColor: '#F59E0B',
    },
    {
      mode: 'dark',
      label: 'Dark Mode',
      description: 'Restful, eye-friendly dark palette for evening and bedtime.',
      icon: 'nightlight-round',
      badgeColor: '#8B5CF6',
    },
    {
      mode: 'system',
      label: 'Automatic / System',
      description: 'Follows the device system settings or scheduled times.',
      icon: 'settings-brightness',
      badgeColor: '#0284C7',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Appearance & Theme</Text>
        <Text style={styles.subtitle}>
          Personalize the viewing theme and configure automatic night-time dimming.
        </Text>
      </View>

      {/* Theme Options */}
      <View style={styles.optionsWrap}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.themeOptionCard, isSelected && styles.themeOptionCardActive]}
              activeOpacity={0.85}
              onPress={() => setThemeMode(opt.mode)}
            >
              <View style={[styles.iconCircle, { backgroundColor: opt.badgeColor + '20' }]}>
                <MaterialIcons name={opt.icon as any} size={26} color={opt.badgeColor} />
              </View>

              <View style={styles.themeOptionTextWrap}>
                <View style={styles.themeOptionHeader}>
                  <Text style={styles.themeOptionTitle}>{opt.label}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.selectedBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.themeOptionDesc}>{opt.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Automatic Schedule Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="schedule" size={24} color="#0284C7" />
            <Text style={styles.cardTitle}>Automatic Night Schedule</Text>
          </View>
          <Switch
            value={appearanceScheduleEnabled}
            onValueChange={setAppearanceScheduleEnabled}
            trackColor={{ true: '#0284C7', false: '#CBD5E1' }}
            thumbColor={appearanceScheduleEnabled ? '#FFFFFF' : '#F1F5F9'}
          />
        </View>

        <Text style={styles.cardDesc}>
          Automatically switch to dark mode at bedtime and return to light mode in the morning.
        </Text>

        <View style={styles.scheduleRow}>
          <View style={styles.scheduleField}>
            <Text style={styles.scheduleLabel}>Dark mode starts</Text>
            <TextInput
              style={styles.timeInput}
              value={darkModeStartDraft}
              onChangeText={setDarkModeStartDraft}
              onEndEditing={() =>
                saveScheduleTime(
                  darkModeStartDraft,
                  darkModeStart,
                  lightModeStart,
                  setDarkModeStart,
                  setDarkModeStartDraft
                )
              }
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={styles.scheduleHint}>e.g. 20:00 (8:00 PM)</Text>
          </View>

          <View style={styles.scheduleField}>
            <Text style={styles.scheduleLabel}>Light mode starts</Text>
            <TextInput
              style={styles.timeInput}
              value={lightModeStartDraft}
              onChangeText={setLightModeStartDraft}
              onEndEditing={() =>
                saveScheduleTime(
                  lightModeStartDraft,
                  lightModeStart,
                  darkModeStart,
                  setLightModeStart,
                  setLightModeStartDraft
                )
              }
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={styles.scheduleHint}>e.g. 07:00 (7:00 AM)</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="visibility" size={24} color="#0284C7" />
            <Text style={styles.cardTitle}>Eye Break Reminder</Text>
          </View>
          <Switch
            value={eyeBreakEnabled}
            onValueChange={toggleEyeBreak}
            trackColor={{ true: '#0284C7', false: '#CBD5E1' }}
            thumbColor={eyeBreakEnabled ? '#FFFFFF' : '#F1F5F9'}
          />
        </View>
        <Text style={styles.cardDesc}>
          Remind your child to rest their eyes after 20 minutes of active watching.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
    lineHeight: 20,
  },
  optionsWrap: {
    gap: 12,
    marginBottom: 20,
  },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  themeOptionCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  themeOptionTextWrap: {
    flex: 1,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  themeOptionDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 19,
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleField: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  scheduleHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
