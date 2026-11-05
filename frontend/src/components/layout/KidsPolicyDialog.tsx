// src/components/layout/KidsPolicyDialog.tsx
import { ChildFontText as Text } from '../ui/ChildFontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { getPrivacyPolicyUrl } from '../../app/config/env';

/**
 * KidsPolicyDialog
 * Comprehensive In-App Legal & Safety Center (YouTube Kids & Google Play Families Standard)
 * Provides detailed, transparent, COPPA/GDPR-K Privacy Policy and Platform Terms of Service.
 */

interface KidsPolicyDialogProps {
  visible: boolean;
  onDismiss: () => void;
}

type PolicyTab = 'privacy' | 'terms';

export const KidsPolicyDialog: React.FC<KidsPolicyDialogProps> = ({
  visible,
  onDismiss,
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>('privacy');

  const handleOpenWebPolicy = () => {
    const url = getPrivacyPolicyUrl();
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open privacy policy URL:', err);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialogCard} testID="kids_policy_dialog">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="verified-user" size={26} color={Colors.kidsSkyBlue} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>KiddoTube Safety & Legal</Text>
              <Text style={styles.subtitle}>Parent-Controlled Safe Streaming Platform</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} accessibilityLabel="Close dialog">
              <MaterialIcons name="close" size={24} color={Colors.kidsTextMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'privacy' && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('privacy')}
            >
              <MaterialIcons
                name="security"
                size={18}
                color={activeTab === 'privacy' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'privacy' && styles.tabBtnTextActive]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'terms' && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('terms')}
            >
              <MaterialIcons
                name="gavel"
                size={18}
                color={activeTab === 'terms' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'terms' && styles.tabBtnTextActive]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.bodyScroll}
          >
            {activeTab === 'privacy' ? (
              // ==========================================
              // PRIVACY POLICY (COPPA / GDPR-K / ZERO ADS)
              // ==========================================
              <View>
                <View style={styles.introBox}>
                  <Text style={styles.introHeading}>Children's Privacy Protection Commitment 🛡️</Text>
                  <Text style={styles.introDesc}>
                    KiddoTube is engineered from the ground up for children under 13 and their families. We strictly comply with COPPA, GDPR-K, and Google Play Families Policies.
                  </Text>
                </View>

                {/* Section 1 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="child-care" size={22} color="#0284C7" />
                    <Text style={styles.cardItemTitle}>1. Zero Collection of Children's Personal Data</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    We never require or collect personally identifiable information (PII) from children. No real names, email addresses, phone numbers, device serial numbers, precise GPS coordinates, or photographs are ever gathered or stored from child users. Children navigate using whimsical nicknames and fun cartoon avatars chosen by parents.
                  </Text>
                </View>

                {/* Section 2 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="block" size={22} color="#EF4444" />
                    <Text style={styles.cardItemTitle}>2. 100% Ad-Free & Zero Behavioral Tracking</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    KiddoTube contains no commercial advertisements, no third-party behavioral tracking SDKs, no retargeting pixels, and no ad identifiers (AAID). Children will never see commercial popups, banners, or product placement promotions while enjoying their favorite shows.
                  </Text>
                </View>

                {/* Section 3 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="lock" size={22} color="#8B5CF6" />
                    <Text style={styles.cardItemTitle}>3. What Data Is Stored & How It Is Used</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    • <Text style={styles.boldText}>Parent Accounts:</Text> Adult email address and salted bcrypt password hash to secure your family dashboard.{'\n'}
                    • <Text style={styles.boldText}>Child Profiles:</Text> Fun nickname, avatar emoji, and optional daily viewing timer limit.{'\n'}
                    • <Text style={styles.boldText}>Playback Progress:</Text> Video watch history and favorite likes are kept locally or in your family database partition solely to support the "Watch It Again" shelf.
                  </Text>
                </View>

                {/* Section 4 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="delete-forever" size={22} color="#10B981" />
                    <Text style={styles.cardItemTitle}>4. Complete Parental Control & Data Deletion</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    Parents maintain full ownership of their family data. You can inspect child watch histories, reset child profiles, or permanently delete child accounts at any time from the Parent Dashboard or by contacting our dedicated support desk.
                  </Text>
                </View>

                {/* Section 5 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="open-in-browser" size={22} color="#F59E0B" />
                    <Text style={styles.cardItemTitle}>5. YouTube API Services & Google Privacy Policy</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    KiddoTube utilizes YouTube API Services to load parent-approved educational and entertaining content. By using this application, users acknowledge and are subject to the YouTube Terms of Service and the Google Privacy Policy (http://www.google.com/policies/privacy).
                  </Text>
                </View>
              </View>
            ) : (
              // ==========================================
              // TERMS OF SERVICE (PARENTAL OVERSIGHT)
              // ==========================================
              <View>
                <View style={styles.introBox}>
                  <Text style={styles.introHeading}>Terms of Service & Family Agreement 📜</Text>
                  <Text style={styles.introDesc}>
                    Please review the terms that govern the use of KiddoTube. All child viewing must be authorized and supervised by a parent or legal guardian.
                  </Text>
                </View>

                {/* Section 1 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="supervisor-account" size={22} color="#0284C7" />
                    <Text style={styles.cardItemTitle}>1. Adult Supervision & Parental Responsibilities</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    You must be at least 18 years old or the legal age of majority in your jurisdiction to create a Parent Account. Parents are responsible for setting up child profiles, configuring screen time limits, and safeguarding the 4-digit Parent PIN.
                  </Text>
                </View>

                {/* Section 2 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="playlist-add-check" size={22} color="#10B981" />
                    <Text style={styles.cardItemTitle}>2. Whitelist Content Management</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    KiddoTube enforces a strict whitelist-only architecture. Children can only view content that has been explicitly reviewed and approved by a parent. The app does not algorithmically recommend unvetted third-party videos, open search the public web, or permit open comment sections.
                  </Text>
                </View>

                {/* Section 3 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="timer" size={22} color="#F59E0B" />
                    <Text style={styles.cardItemTitle}>3. Screen Time Limits & Daily Sessions</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    Daily screen time timers are enforced automatically. When daily minutes expire, playback is locked and children cannot bypass the lock without parent passcode verification. Optional 20-minute eye break alerts encourage healthy rest habits.
                  </Text>
                </View>

                {/* Section 4 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="download" size={22} color="#0284C7" />
                    <Text style={styles.cardItemTitle}>4. Offline Playback & Download Usage</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    Videos downloaded within the app are strictly for personal, non-commercial, family offline viewing on the user's mobile device. Downloaded media cannot be transferred, redistributed, re-broadcasted, or sold.
                  </Text>
                </View>

                {/* Section 5 */}
                <View style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <MaterialIcons name="policy" size={22} color="#EF4444" />
                    <Text style={styles.cardItemTitle}>5. YouTube Terms of Service Compliance</Text>
                  </View>
                  <Text style={styles.cardItemBody}>
                    All video streaming is delivered via authorized YouTube embedded players in compliance with YouTube API Developer Policies. Users agree to abide by the official YouTube Terms of Service (https://www.youtube.com/t/terms).
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.webPolicyButton}
              activeOpacity={0.85}
              onPress={handleOpenWebPolicy}
            >
              <MaterialIcons name="open-in-new" size={17} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={styles.webPolicyText} numberOfLines={1}>Official Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              activeOpacity={0.85}
              onPress={onDismiss}
            >
              <Text style={styles.doneText}>Understood 👍</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 480,
    height: '84%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  bodyScroll: {
    paddingVertical: 8,
  },
  introBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  introHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C4A6E',
    lineHeight: 18,
  },
  cardItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  cardItemBody: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  webPolicyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  webPolicyText: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: '800',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

