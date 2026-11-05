// src/features/parental/ParentSettingsDialog.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import { VideoCategory } from '../../types/models';
import type { VideoItem } from '../../types/models';

/**
 * ParentSettingsDialog
 * Migrated 1:1 from Kotlin ParentSettingsDialog.kt
 * 
 * Quick parent dashboard with:
 * - Daily screen time slider
 * - Add approved video form
 */

interface ParentSettingsDialogProps {
  visible: boolean;
  currentLimitMinutes?: number;
  onDismiss: () => void;
  onUpdateDailyLimit: (limit: number) => void;
  onAddApprovedVideo: (video: VideoItem) => void;
}

export const ParentSettingsDialog: React.FC<ParentSettingsDialogProps> = ({
  visible,
  currentLimitMinutes = 60,
  onDismiss,
  onUpdateDailyLimit,
  onAddApprovedVideo,
}) => {
  const [limitSlider, setLimitSlider] = useState(currentLimitMinutes);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoChannel, setNewVideoChannel] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const handleClose = () => {
    setLimitSlider(currentLimitMinutes);
    setNewVideoTitle('');
    setNewVideoChannel('');
    setNewVideoUrl('');
    setAddSuccess(false);
    onDismiss();
  };

  const handleAddVideo = () => {
    if (!newVideoTitle.trim() || !newVideoChannel.trim()) return;

    const newVideo: VideoItem = {
      id: `user_v_${Date.now()}`,
      youtubeId: 'custom_id',
      title: newVideoTitle.trim(),
      channelTitle: newVideoChannel.trim(),
      thumbnailUrl:
        'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&auto=format&fit=crop&q=80',
      durationText: '05:00',
      category: VideoCategory.LEARNING,
      description: 'Parent approved video',
      isBlocked: false,
    };

    onAddApprovedVideo(newVideo);
    setNewVideoTitle('');
    setNewVideoChannel('');
    setNewVideoUrl('');
    setAddSuccess(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} testID="parent_settings_dialog">
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.shieldCircle}>
                  <MaterialIcons
                    name="security"
                    size={20}
                    color={Colors.kidsPrimary}
                  />
                </View>
                <Text style={styles.headerTitle}>Parent Dashboard</Text>
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

            {/* Section 1: Screen Time */}
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="timer"
                size={20}
                color={Colors.kidsSkyBlue}
              />
              <Text style={styles.sectionTitle}>Daily Screen Time Limit</Text>
            </View>

            <Text style={styles.bigMinutes}>
              {Math.round(limitSlider)} minutes per day
            </Text>

            <Slider
              value={limitSlider}
              onValueChange={(v) => {
                setLimitSlider(v);
                onUpdateDailyLimit(Math.round(v));
              }}
              minimumValue={15}
              maximumValue={180}
              step={15}
              minimumTrackTintColor={Colors.kidsPrimary}
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor={Colors.kidsPrimary}
            />

            {/* Section 2: Add Video */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <MaterialIcons
                name="add"
                size={22}
                color={Colors.kidsSkyBlue}
              />
              <Text style={styles.sectionTitle}>Add Approved Video</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Video Title (e.g. Solar System for Kids)"
              placeholderTextColor={Colors.kidsTextMuted}
              value={newVideoTitle}
              onChangeText={setNewVideoTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Channel Name (e.g. National Geographic Kids)"
              placeholderTextColor={Colors.kidsTextMuted}
              value={newVideoChannel}
              onChangeText={setNewVideoChannel}
            />

            <TextInput
              style={styles.input}
              placeholder="YouTube URL (https://youtube.com/watch?v=...)"
              placeholderTextColor={Colors.kidsTextMuted}
              value={newVideoUrl}
              onChangeText={setNewVideoUrl}
              autoCapitalize="none"
            />

            {addSuccess ? (
              <Text style={styles.successText}>
                ✅ Video approved and added to Child Home!
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.addVideoButton}
              activeOpacity={0.85}
              onPress={handleAddVideo}
            >
              <Text style={styles.addVideoText}>
                Approve & Add to Kid's Library
              </Text>
            </TouchableOpacity>

            {/* Done */}
            <TouchableOpacity
              style={styles.doneButton}
              activeOpacity={0.85}
              onPress={handleClose}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
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
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: Colors.kidsSurface,
    borderRadius: Dimensions.radiusLarge,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    padding: Dimensions.spaceLarge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.kidsPrimary + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: Colors.kidsTextPrimary,
    marginLeft: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.kidsTextPrimary,
    marginLeft: 8,
  },
  bigMinutes: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.kidsPrimary,
    marginTop: 4,
  },
  input: {
    width: '100%',
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.kidsTextPrimary,
    marginTop: 10,
  },
  successText: {
    ...Typography.labelMedium,
    color: Colors.kidsSkyBlue,
    fontWeight: '700',
    marginTop: 8,
  },
  addVideoButton: {
    marginTop: 14,
    backgroundColor: Colors.kidsSkyBlue,
    height: Dimensions.touchTargetMin,
    borderRadius: Dimensions.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVideoText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  doneButton: {
    marginTop: 18,
    backgroundColor: Colors.kidsPrimary,
    height: Dimensions.touchTargetMin,
    borderRadius: Dimensions.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});