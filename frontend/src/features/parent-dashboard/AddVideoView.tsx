// src/features/parent-dashboard/AddVideoView.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { extractYoutubeId, getYoutubeThumbnailUrl } from '../../utils/youtube';
import { ContentAudiencePicker } from '../../components/ui/ContentAudiencePicker';
import type { ChildDetailDto } from '../../types/api';

interface AddVideoViewProps {
  onBack: () => void;
  children: ChildDetailDto[];
  onAddVideo: (
    title: string,
    channel: string,
    youtubeId: string,
    category: string,
    childIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
}

const CATEGORY_OPTIONS = [
  { key: 'LEARNING', label: 'Learning', icon: 'lightbulb' },
  { key: 'MUSIC', label: 'Music', icon: 'music-note' },
  { key: 'SHOWS', label: 'Shows', icon: 'movie' },
  { key: 'EXPLORE', label: 'Explore', icon: 'explore' },
];

export const AddVideoView: React.FC<AddVideoViewProps> = ({
  onBack,
  children,
  onAddVideo,
}) => {
  const [ytUrlOrId, setYtUrlOrId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Optional, not auto-selected
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  // Derive YouTube ID and preview thumbnail
  const detectedYtId = extractYoutubeId(ytUrlOrId.trim());
  const previewThumbnail = detectedYtId ? getYoutubeThumbnailUrl(detectedYtId) : null;

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setYtUrlOrId(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handleApprove = async () => {
    const youtubeId = extractYoutubeId(ytUrlOrId.trim());
    if (!youtubeId) {
      Alert.alert(
        'Invalid YouTube Link',
        'Please enter a valid YouTube video URL or 11-character video ID.'
      );
      return;
    }

    setIsSubmitting(true);
    const categoryToSend = selectedCategory || 'ALL';
    const result = await onAddVideo(
      '', // title not required, server or defaults will populate
      '', // channel not required
      youtubeId,
      categoryToSend,
      selectedChildIds
    );
    setIsSubmitting(false);

    if (result.success) {
      Alert.alert('Video Approved', 'The video has been added to your kids whitelist!');
      onBack();
    } else {
      Alert.alert('Unable to Add Video', result.error ?? 'Please check the link and try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back to content"
        >
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Add YouTube Video</Text>
          <Text style={styles.headerSubtitle}>Approve video for your child's library</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoCard}>
          <MaterialIcons name="security" size={26} color="#0284C7" />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoCardTitle}>Protected Whitelist</Text>
            <Text style={styles.infoCardBody}>
              Paste any YouTube video link here. Kids can only watch content explicitly approved by you.
            </Text>
          </View>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>YouTube Video Link or ID *</Text>
            <TouchableOpacity style={styles.pasteBadge} onPress={handlePaste}>
              <MaterialIcons name="content-paste" size={15} color="#0284C7" />
              <Text style={styles.pasteBadgeText}>Paste Link</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/watch?v=... or ID"
            placeholderTextColor="#94A3B8"
            value={ytUrlOrId}
            onChangeText={setYtUrlOrId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Live Thumbnail Preview if valid */}
          {detectedYtId && previewThumbnail ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: previewThumbnail }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewMeta}>
                <View style={styles.previewBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#16A34A" />
                  <Text style={styles.previewBadgeText}>Valid YouTube ID: {detectedYtId}</Text>
                </View>
              </View>
            </View>
          ) : null}

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
            Optionally organize this video under a category tab. If skipped, it will appear under All.
          </Text>

          <View style={styles.categoryRow}>
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
          </View>

          <ContentAudiencePicker
            children={children}
            selectedChildIds={selectedChildIds}
            onChange={setSelectedChildIds}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!detectedYtId || isSubmitting) && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleApprove}
            disabled={!detectedYtId || isSubmitting}
          >
            <MaterialIcons
              name={isSubmitting ? 'hourglass-empty' : 'check'}
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Approving Video...' : 'Approve & Add Video'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 12,
  },
  previewBox: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  previewMeta: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
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
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
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
    fontWeight: '900',
    color: '#000000',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E52E2E',
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 20,
    gap: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
