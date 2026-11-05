// src/features/parent-dashboard/dialogs/AddPlaylistDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../../components/ui/FontText';

import React, { useState } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Typography } from '../../../theme/typography';
import { extractPlaylistId } from '../../../utils/youtube';
import { ContentAudiencePicker } from '../../../components/ui/ContentAudiencePicker';
import type { ChildDetailDto } from '../../../types/api';

/**
 * AddPlaylistDialog
 * Migrated 1:1 from Kotlin ParentPanelScreen.kt → AddPlaylistDialog
 */

interface AddPlaylistDialogProps {
  visible: boolean;
  onDismiss: () => void;
  children: ChildDetailDto[];
  onConfirm: (
    title: string,
    urlOrId: string,
    channelTitle: string,
    category: string,
    childIds: string[]
  ) => void;
}

const CATEGORY_OPTIONS = [
  { key: 'LEARNING', label: 'Learning', icon: 'lightbulb' },
  { key: 'MUSIC', label: 'Music', icon: 'music-note' },
  { key: 'SHOWS', label: 'Shows', icon: 'movie' },
  { key: 'EXPLORE', label: 'Explore', icon: 'explore' },
];

export const AddPlaylistDialog: React.FC<AddPlaylistDialogProps> = ({
  visible,
  onDismiss,
  children,
  onConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [playlistUrlOrId, setPlaylistUrlOrId] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [category, setCategory] = useState('LEARNING');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  const handleClose = () => {
    setTitle('');
    setPlaylistUrlOrId('');
    setChannelTitle('');
    setCategory('LEARNING');
    setSelectedChildIds([]);
    onDismiss();
  };

  const handleApprove = () => {
    const playlistId = extractPlaylistId(playlistUrlOrId);
    if (!playlistId) {
      Alert.alert(
        'Invalid playlist details',
        'Enter a valid YouTube playlist URL or ID.'
      );
      return;
    }
    onConfirm(
      title.trim(),
      playlistId,
      channelTitle.trim(),
      category,
      selectedChildIds
    );
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Approve YouTube Playlist</Text>

          <ScrollView
            contentContainerStyle={{ paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Custom Playlist Title (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bedtime Calm & Lullabies"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>YouTube Playlist URL or list= ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/playlist?list=..."
              placeholderTextColor="#94A3B8"
              value={playlistUrlOrId}
              onChangeText={setPlaylistUrlOrId}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Channel / Creator (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Channel Name"
              placeholderTextColor="#94A3B8"
              value={channelTitle}
              onChangeText={setChannelTitle}
            />

            {/* Category Dropdown / Selector */}
            <Text style={styles.fieldLabel}>Category Tab *</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <MaterialIcons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#475569'}
                      style={{ marginRight: 4 }}
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
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleApprove}
            >
              <Text style={styles.confirmText}>Approve Playlist</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    ...Typography.titleLarge,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#3A9BE8',
    borderColor: '#3A9BE8',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  confirmButton: {
    backgroundColor: '#3A9BE8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});