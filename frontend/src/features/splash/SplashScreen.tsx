// src/features/splash/SplashScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import { useContentStore } from '../../store/contentStore';
import { useParentAdminStore } from '../../store/parentAdminStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { KiddoTubeLogo } from '../../components/branding';
import { ScreenState } from '../../types/navigation';
import type { RootStackParamList } from '../../types/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * SplashScreen
 * KiddoTube branding - Concept 3 Flying Sun App Icon.
 */

type SplashScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.SPLASH
>;

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const scale = useSharedValue(0.5);
  const pulseScale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  const [initStatusText, setInitStatusText] = useState(
    'Starting up KiddoTube...'
  );

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    scale.value = withSpring(1.0, { damping: 12, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 400 });

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const runInit = async () => {
      try {
        const restoredRole =
          await useParentAdminStore.getState().restoreSession();
        if (restoredRole === 'parent') {
          navigation.replace(ScreenState.PARENT_PANEL);
          return;
        }
        if (restoredRole === 'admin') {
          navigation.replace(ScreenState.ADMIN_PANEL);
          return;
        }

        setInitStatusText('Connecting to safe kids network...');
        const backendConnected =
          await useContentStore.getState().initializeAppData();

        const session = useContentStore.getState().session;
        const childToken = useContentStore.getState().childToken;
        if (session.isAuthenticated && childToken && session.profile) {
          await useScreenTimeStore.getState().initializeForChild(
            childToken,
            session.profile.id,
            session.profile.parentId,
            session.profile.dailyLimitMinutes
          );
        }

        setInitStatusText(
          backendConnected ? 'Ready to explore! 🚀' : 'Safe offline mode active! 🎈'
        );
        navigation.replace(
          session.isAuthenticated ? ScreenState.HOME : ScreenState.CHILD_LOGIN
        );
      } catch (error) {
        console.error('[SplashScreen] App initialization failed:', error);
        navigation.replace(ScreenState.CHILD_LOGIN);
      }
    };

    runInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <LinearGradient
      colors={['#E8F4FD', '#FFF4F6', '#FFFDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.content, emblemStyle]}>
        <Animated.View style={pulseStyle}>
          <KiddoTubeLogo size="large" showTagline={true} />
        </Animated.View>

        <View style={styles.statusPill}>
          <ActivityIndicator size="small" color={Colors.kidsPrimary} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  emblem: {
    width: 112,
    height: 112,
    borderRadius: 34,
    overflow: 'hidden',
    shadowColor: Colors.kidsPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  emblemGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', marginTop: Dimensions.spaceLarge },
  titleKids: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.kidsPrimary,
  },
  titleStream: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.kidsSkyBlue,
  },
  tagline: {
    ...Typography.bodyLarge,
    color: '#64748B',
    fontWeight: '500',
    marginTop: Dimensions.spaceSmall,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 36,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
  },
  statusText: {
    marginLeft: 10,
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});