// src/features/parent-dashboard/ParentChildrenView.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { hexLongToColor } from '../../utils/color';
import { copyToClipboard } from '../../utils/clipboard';
import type { ChildDetailDto } from '../../types/api';
import { getChildAgeBandLabel } from '../../constants/childProfiles';

/**
 * ParentChildrenView
 * Children list with avatar, credentials copy, watched-today,
 * reset password, and delete actions.
 */

interface ParentChildrenViewProps {
  children: ChildDetailDto[];
  onAddChildClick: () => void;
  onResetPasswordClick: (child: ChildDetailDto) => void;
  onDeleteChildClick: (child: ChildDetailDto) => void;
  passwordRevision: number;
  onGetChildPassword: (
    childId: string
  ) => Promise<{ success: boolean; password?: string; error?: string }>;
}

export const ParentChildrenView: React.FC<ParentChildrenViewProps> = ({
  children,
  onAddChildClick,
  onResetPasswordClick,
  onDeleteChildClick,
  passwordRevision,
  onGetChildPassword,
}) => {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      decelerationRate={0.92}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title} numberOfLines={1}>
            Children Profiles ({children.length})
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Manage child explorer accounts and safety limits
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={onAddChildClick}
          accessibilityRole="button"
          accessibilityLabel="Add Child"
          testID="add_child_button"
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addText}>Add Child</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="person" size={54} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No children profiles yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap 'Add Child' above to create a profile for your kid.
          </Text>
        </View>
      ) : (
        children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            passwordRevision={passwordRevision}
            onGetPassword={() => onGetChildPassword(child.id)}
            onResetPassword={() => onResetPasswordClick(child)}
            onDelete={() => onDeleteChildClick(child)}
          />
        ))
      )}
    </ScrollView>
  );
};

// --- ChildCard ---
interface ChildCardProps {
  child: ChildDetailDto;
  passwordRevision: number;
  onGetPassword: () => Promise<{ success: boolean; password?: string; error?: string }>;
  onResetPassword: () => void;
  onDelete: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({
  child,
  passwordRevision,
  onGetPassword,
  onResetPassword,
  onDelete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  useEffect(() => {
    setShowPassword(false);
    setPassword(null);
  }, [passwordRevision]);

  const handleCopy = async () => {
    let plainPass = password;
    if (!plainPass) {
      setIsLoadingPassword(true);
      try {
        const result = await onGetPassword();
        if (result.success && result.password) {
          plainPass = result.password;
          setPassword(plainPass);
          setShowPassword(true);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsLoadingPassword(false);
      }
    }

    if (!plainPass) {
      Alert.alert('Password unavailable', 'Unable to retrieve password for copying. Please reset it.');
      return;
    }

    const credText = `Child Explorer Credentials:\nUsername: ${child.username}\nPassword: ${plainPass}`;
    await copyToClipboard(credText, `Login credentials for ${child.displayName} copied to clipboard!`);
  };

  const handleTogglePassword = async () => {
    if (showPassword) {
      setShowPassword(false);
      setPassword(null);
      return;
    }

    setIsLoadingPassword(true);
    try {
      const result = await onGetPassword();
      if (!result.success || !result.password) {
        Alert.alert('Password unavailable', result.error ?? 'Unable to retrieve this password.');
        return;
      }
      setPassword(result.password);
      setShowPassword(true);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <View style={styles.childCard}>
      {/* Top row: avatar + info + delete */}
      <View style={styles.childTopRow}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: hexLongToColor(child.colorHex) },
          ]}
        >
          <Text style={styles.avatarEmoji}>{child.avatarEmoji}</Text>
        </View>

        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.displayName}</Text>
          <Text style={styles.childMeta}>
            Username: {child.username} • {getChildAgeBandLabel(child.ageGroup)}
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={onDelete} accessibilityLabel="Delete child profile">
          <MaterialIcons name="delete" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Credentials Box */}
      <View style={styles.credentialsBox}>
        <View style={styles.credRows}>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Username:</Text>
            <Text style={styles.credValue} numberOfLines={1} ellipsizeMode="tail">
              {child.username}
            </Text>
          </View>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Password:</Text>
            <View style={styles.passwordPill}>
              <Text style={styles.passwordText} numberOfLines={1} ellipsizeMode="middle">
                {showPassword && password ? password : '••••••••'}
              </Text>
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={handleTogglePassword}
                disabled={isLoadingPassword}
                accessibilityLabel={showPassword ? 'Hide child password' : 'Show child password'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name={isLoadingPassword ? 'hourglass-empty' : showPassword ? 'visibility-off' : 'visibility'}
                  size={18}
                  color="#0284C7"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
          accessibilityLabel="Copy Credentials"
          activeOpacity={0.8}
        >
          <MaterialIcons name="content-copy" size={16} color="#0284C7" />
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom: watched + reset password */}
      <View style={styles.childBottomRow}>
        <View style={styles.watchedWrap}>
          <MaterialIcons name="timer" size={16} color="#0284C7" />
          <Text style={styles.watchedText}>
            Watched: {child.minutesWatchedToday}m / {child.dailyLimitMinutes}m limit
          </Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={onResetPassword}>
          <MaterialIcons name="lock-reset" size={16} color="#0284C7" />
          <Text style={styles.resetText}>Reset Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginTop: 3,
    lineHeight: 18,
  },
  addButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E52E2E',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#E52E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 36,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 18,
    color: '#000000',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  childInfo: {
    flex: 1,
    marginLeft: 14,
  },
  childName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
  },
  childMeta: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    marginTop: 3,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  credRows: {
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    width: 76,
  },
  credValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    flex: 1,
  },
  passwordPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passwordText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    flex: 1,
    marginRight: 6,
  },
  eyeBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    flexShrink: 0,
    alignSelf: 'center',
  },
  copyText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '900',
  },
  childBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  watchedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  watchedText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '800',
  },
});