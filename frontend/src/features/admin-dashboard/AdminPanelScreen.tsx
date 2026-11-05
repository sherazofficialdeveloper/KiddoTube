// src/features/admin-dashboard/AdminPanelScreen.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';

import { AdminOverviewView } from './AdminOverviewView';
import { AdminParentsListView } from './AdminParentsListView';
import { AdminChildrenListView } from './AdminChildrenListView';
import { AdminContentOversightView } from './AdminContentOversightView';
import { AddParentDialog } from './AddParentDialog';

import { useParentAdminStore } from '../../store/parentAdminStore';
import { AdminSection } from '../../types/navigation';
import { resetToChildLogin } from '../../app/navigation/navigationRef';
import { KiddoTubeLogo } from '../../components/branding';

/**
 * AdminPanelScreen
 * Migrated 1:1 from Kotlin AdminPanelScreen.kt
 * 
 * Dark top bar + 4-item bottom nav
 * Sections: Overview, Parents, Children, Content
 */

export const AdminPanelScreen: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AdminSection>(
    AdminSection.OVERVIEW
  );
  const [adminContentSubTab, setAdminContentSubTab] = useState<'video' | 'channel' | 'playlist'>('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddParent, setShowAddParent] = useState(false);
  const didInitialLoad = useRef(false);

  const adminDashboard = useParentAdminStore((s) => s.adminDashboard);
  const adminToken = useParentAdminStore((s) => s.adminToken);
  const adminParents = useParentAdminStore((s) => s.adminParents);
  const adminChildren = useParentAdminStore((s) => s.adminChildrenList);
  const adminVideos = useParentAdminStore((s) => s.adminVideos);
  const adminChannels = useParentAdminStore((s) => s.adminChannels);
  const adminPlaylists = useParentAdminStore((s) => s.adminPlaylists);

  const fetchAdminDashboard = useParentAdminStore(
    (s) => s.fetchAdminDashboard
  );
  const fetchAdminParents = useParentAdminStore((s) => s.fetchAdminParents);
  const fetchAdminChildren = useParentAdminStore((s) => s.fetchAdminChildren);
  const fetchAdminContent = useParentAdminStore((s) => s.fetchAdminContent);
  const createParentByAdmin = useParentAdminStore((s) => s.createParentByAdmin);
  const toggleParentStatus = useParentAdminStore((s) => s.toggleParentStatus);
  const deleteAdminParent = useParentAdminStore((s) => s.deleteAdminParent);
  const toggleChildStatus = useParentAdminStore((s) => s.toggleChildStatus);
  const deleteAdminChild = useParentAdminStore((s) => s.deleteAdminChild);
  const moderateContent = useParentAdminStore((s) => s.moderateContent);
  const logoutAdmin = useParentAdminStore((s) => s.logoutAdmin);

  useEffect(() => {
    if (!adminToken) {
      didInitialLoad.current = false;
      return;
    }
    didInitialLoad.current = false;
    void Promise.all([
      fetchAdminDashboard(),
      fetchAdminParents(),
      fetchAdminChildren(),
      fetchAdminContent(),
    ]).finally(() => {
      didInitialLoad.current = true;
    });
  }, [adminToken, fetchAdminDashboard, fetchAdminParents, fetchAdminChildren, fetchAdminContent]);

  useEffect(() => {
    if (!didInitialLoad.current) return;
    if (currentSection === AdminSection.PARENTS) {
      setSearchQuery('');
      if (adminParents.length === 0) void fetchAdminParents();
    } else if (currentSection === AdminSection.CHILDREN) {
      setSearchQuery('');
      if (adminChildren.length === 0) void fetchAdminChildren();
    } else if (currentSection === AdminSection.CONTENT) {
      if (
        adminVideos.length === 0 &&
        adminChannels.length === 0 &&
        adminPlaylists.length === 0
      ) {
        void fetchAdminContent();
      }
    }
  }, [
    currentSection,
    adminParents.length,
    adminChildren.length,
    adminVideos.length,
    adminChannels.length,
    adminPlaylists.length,
    fetchAdminParents,
    fetchAdminChildren,
    fetchAdminContent,
  ]);

  const handleReturnToApp = () => {
    Alert.alert('Log out', 'Log out of the admin account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logoutAdmin();
          resetToChildLogin();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} testID="admin_panel_screen">
      {/* Top App Bar - Clean Light with Brand Accents */}
      <View style={styles.topBar}>
        {currentSection !== AdminSection.OVERVIEW && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentSection(AdminSection.OVERVIEW)}
            accessibilityLabel="Back to Overview"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        )}

        <View style={styles.logoBadge}>
          <KiddoTubeLogo size="icon-only" />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.topTitle}>KiddoTube Admin Console</Text>
          <Text style={styles.topSubtitle}>
            Platform Governance
          </Text>
        </View>

        <TouchableOpacity
          style={styles.kidsViewButton}
          onPress={handleReturnToApp}
        >
          <MaterialIcons name="logout" size={16} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.kidsViewText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {currentSection === AdminSection.OVERVIEW && (
          <AdminOverviewView
            stats={adminDashboard}
            onRefresh={() => {
              fetchAdminDashboard();
              fetchAdminParents();
              fetchAdminChildren();
            }}
            onNavigateSection={(sec, subTab) => {
              if (subTab) {
                setAdminContentSubTab(subTab);
              }
              setCurrentSection(sec);
            }}
          />
        )}

        {currentSection === AdminSection.PARENTS && (
          <AdminParentsListView
            parents={adminParents}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
            }}
            onToggleStatus={(id, st) => toggleParentStatus(id, st)}
            onDeleteParent={(id) => deleteAdminParent(id)}
            onAddParentClick={() => setShowAddParent(true)}
          />
        )}

        {currentSection === AdminSection.CHILDREN && (
          <AdminChildrenListView
            children={adminChildren}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
            }}
            onToggleStatus={(id, st) => toggleChildStatus(id, st)}
            onDeleteChild={(id) => deleteAdminChild(id)}
          />
        )}

        {currentSection === AdminSection.CONTENT && (
          <AdminContentOversightView
            videos={adminVideos}
            channels={adminChannels}
            playlists={adminPlaylists}
            children={adminChildren}
            parents={adminParents}
            initialContentType={adminContentSubTab}
            onModerate={(type, id, action) => moderateContent(type, id, action)}
          />
        )}
      </View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <NavItem
          icon="home"
          label="Overview"
          isSelected={currentSection === AdminSection.OVERVIEW}
          onPress={() => setCurrentSection(AdminSection.OVERVIEW)}
        />
        <NavItem
          icon="manage-accounts"
          label="Parents"
          isSelected={currentSection === AdminSection.PARENTS}
          onPress={() => setCurrentSection(AdminSection.PARENTS)}
        />
        <NavItem
          icon="people"
          label="Children"
          isSelected={currentSection === AdminSection.CHILDREN}
          onPress={() => setCurrentSection(AdminSection.CHILDREN)}
        />
        <NavItem
          icon="video-library"
          label="Content"
          isSelected={currentSection === AdminSection.CONTENT}
          onPress={() => setCurrentSection(AdminSection.CONTENT)}
        />
      </View>

      <AddParentDialog
        visible={showAddParent}
        onDismiss={() => setShowAddParent(false)}
        onConfirm={createParentByAdmin}
      />
    </SafeAreaView>
  );
};

// --- NavItem ---
interface NavItemProps {
  icon: MaterialIconsIconName;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}
const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.navItem}
    activeOpacity={0.75}
    onPress={onPress}
  >
    <MaterialIcons
      name={icon}
      size={24}
      color={isSelected ? '#E52E2E' : '#475569'}
    />
    <Text
      style={[
        styles.navLabel,
        {
          color: isSelected ? '#E52E2E' : '#334155',
          fontWeight: isSelected ? '900' : '800',
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  logoBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  titleBlock: {
    flex: 1,
    marginLeft: 10,
  },
  topTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: '#0F172A',
    fontWeight: '900',
  },
  topSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  kidsViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  kidsViewText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: 'Nunito-Bold',
    fontWeight: '800',
  },
});