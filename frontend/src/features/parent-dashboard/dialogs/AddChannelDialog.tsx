// src/features/parent-dashboard/dialogs/AddChannelDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../../components/ui/FontText';

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { ContentAudiencePicker } from '../../../components/ui/ContentAudiencePicker';
import type { ChildDetailDto } from '../../../types/api';

interface AddChannelDialogProps {
  visible: boolean;
  onDismiss: () => void;
  children: ChildDetailDto[];
  onConfirm: (
    title: string,
    channelUrlOrId: string,
    desc: string,
    category: string,
    childIds: string[]
  ) => void;
}

const CATEGORY_OPTIONS = [
  { key: 'SHOWS', label: 'Shows', icon: 'movie' },
  { key: 'LEARNING', label: 'Learning', icon: 'lightbulb' },
  { key: 'MUSIC', label: 'Music', icon: 'music-note' },
  { key: 'EXPLORE', label: 'Explore', icon: 'explore' },
];

export const AddChannelDialog: React.FC<AddChannelDialogProps> = ({
  visible,
  onDismiss,
  children,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const [channelUrlOrId, setChannelUrlOrId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setChannelUrlOrId('');
    setSelectedCategory(null);
    setSelectedChildIds([]);
    setIsSubmitting(false);
    onDismiss();
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setChannelUrlOrId(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handleApprove = () => {
    const cleanUrl = channelUrlOrId.trim();
    if (!cleanUrl) {
      Alert.alert(
        'Missing Channel Link',
        'Please enter a YouTube channel URL, handle (@channel), or channel ID.'
      );
      return;
    }

    setIsSubmitting(true);
    onConfirm(
      '', // title resolved automatically by YouTube API
      cleanUrl,
      '', // description omitted
      selectedCategory || 'SHOWS',
      selectedChildIds
    );
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleClose}
            accessibilityLabel="Go back to content"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Add YouTube Channel</Text>
            <Text style={styles.headerSubtitle}>Approve creator channel for your children</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={styles.infoCard}>
            <MaterialIcons name="security" size={26} color="#0284C7" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoCardTitle}>Protected Whitelist</Text>
              <Text style={styles.infoCardBody}>
                Paste any YouTube channel link or @handle. All videos from this creator will be safely approved for your kids.
              </Text>
            </View>
          </View>

          {/* Input Card */}
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>YouTube Channel URL or @Handle *</Text>
              <TouchableOpacity style={styles.pasteBadge} onPress={handlePaste}>
                <MaterialIcons name="content-paste" size={15} color="#0284C7" />
                <Text style={styles.pasteBadgeText}>Paste Link</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/@creator or channel URL"
              placeholderTextColor="#94A3B8"
              value={channelUrlOrId}
              onChangeText={setChannelUrlOrId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Optional Category Selector (None selected by default) */}
            <View style={styles.categoryHeader}>
              <Text style={styles.label}>Category Tab (Optional)</Text>
              {selectedCategory && (
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                  <Text style={styles.clearCategoryText}>Clear selection</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.categoryHelp}>
              Optionally organize this channel under a category tab. If skipped, it will appear under All.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(isSelected ? null : cat.key);
                    }}
                  >
                    <MaterialIcons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#475569'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ContentAudiencePicker
              children={children}
              selectedChildIds={selectedChildIds}
              onChange={setSelectedChildIds}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!channelUrlOrId.trim() || isSubmitting) && styles.submitButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleApprove}
              disabled={!channelUrlOrId.trim() || isSubmitting}
            >
              <MaterialIcons
                name={isSubmitting ? 'hourglass-empty' : 'check'}
                size={22}
                color="#FFFFFF"
              />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Approving Channel...' : 'Approve & Add Channel'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E40AF',
  },
  infoCardBody: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pasteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  pasteBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4,
  },
  clearCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  categoryHelp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10,
    lineHeight: 18,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    marginBottom: 20,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  submitButton: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
