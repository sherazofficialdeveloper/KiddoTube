// src/app/navigation/RootNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { navigationRef } from './navigationRef';
import { ScreenState } from '../../types/navigation';
import type { RootStackParamList } from '../../types/navigation';

import { useScreenTimeStore } from '../../store/screenTimeStore';

import { SplashScreen } from '../../features/splash/SplashScreen';
import { ChildLoginScreen } from '../../features/auth/ChildLoginScreen';
import { HomeScreen } from '../../features/home/HomeScreen';
import { ExploreScreen } from '../../features/explore/ExploreScreen';
import { SearchScreen } from '../../features/search/SearchScreen';
import { ChannelDetailsScreen } from '../../features/channel/ChannelDetailsScreen';
import { PlaylistDetailsScreen } from '../../features/playlist/PlaylistDetailsScreen';
import { VideoPlayerScreen } from '../../features/player/VideoPlayerScreen';
import { ChildProfileScreen } from '../../features/profile/ChildProfileScreen';
import { ParentPanelScreen } from '../../features/parent-dashboard/ParentPanelScreen';
import { AdminPanelScreen } from '../../features/admin-dashboard/AdminPanelScreen';
import { TimeOutScreen } from '../../features/timeout/TimeOutScreen';
import { ParentAuthScreen } from '../../features/parental/ParentAuthScreen';
import { DownloadsManagerScreen } from '../../features/downloads/DownloadsManagerScreen';
import { AlmostTimeDialog } from '../../features/timeout/AlmostTimeDialog';

/**
 * RootNavigator
 * Migrated from Kotlin KidsAppRoot.kt
 * 
 * - Stack Navigator
 * - Top-level lock override (isLocked → TimeOutScreen)
 * - Passes `onProtectedSettingsClick` to screens that need it
 */

import { AuthMode } from '../../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onProtectedSettingsClick: (mode?: AuthMode) => void;
  onTimeoutProtectedSettingsClick: () => void;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({
  onProtectedSettingsClick,
  onTimeoutProtectedSettingsClick,
}) => {
  const isLocked = useScreenTimeStore((s) => s.isLocked);
  const pendingWarningMinutes = useScreenTimeStore(
    (s) => s.pendingWarningMinutes
  );
  const dismissAlmostTimeWarning = useScreenTimeStore(
    (s) => s.dismissAlmostTimeWarning
  );

  // Lock override — render lock screen instead of navigator
  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <TimeOutScreen
          onProtectedSettingsClick={onTimeoutProtectedSettingsClick}
        />
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={ScreenState.SPLASH}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen
          name={ScreenState.SPLASH}
          component={SplashScreen}
        />

        <Stack.Screen name={ScreenState.CHILD_LOGIN}>
          {(props) => (
            <ChildLoginScreen
              {...props}
              onParentSettingsClick={onProtectedSettingsClick}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name={ScreenState.HOME}
          component={HomeScreen}
        />

        <Stack.Screen
          name={ScreenState.EXPLORE}
          component={ExploreScreen}
        />

        <Stack.Screen
          name={ScreenState.SEARCH}
          component={SearchScreen}
        />
        <Stack.Screen
          name={ScreenState.CHANNEL_DETAILS}
          component={ChannelDetailsScreen}
        />
        <Stack.Screen
          name={ScreenState.PLAYLIST_DETAILS}
          component={PlaylistDetailsScreen}
        />
        <Stack.Screen
          name={ScreenState.PLAYER}
          component={VideoPlayerScreen}
          options={{
            orientation: 'landscape',
            navigationBarHidden: true,
            statusBarHidden: true,
          }}
        />

        <Stack.Screen
          name={ScreenState.PROFILE}
          component={ChildProfileScreen}
        />

        <Stack.Screen
          name={ScreenState.PARENT_PANEL}
          component={ParentPanelScreen}
        />
        <Stack.Screen
          name={ScreenState.ADMIN_PANEL}
          component={AdminPanelScreen}
        />
        <Stack.Screen
          name={ScreenState.PARENT_AUTH}
          component={ParentAuthScreen}
        />

        <Stack.Screen
          name={ScreenState.DOWNLOADS_MANAGER}
          component={DownloadsManagerScreen}
        />
      </Stack.Navigator>
      </NavigationContainer>
      <AlmostTimeDialog
        visible={pendingWarningMinutes !== null}
        minutesRemaining={pendingWarningMinutes ?? 0}
        onDismiss={dismissAlmostTimeWarning}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  lockContainer: {
    flex: 1,
  },
});
