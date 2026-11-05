// App.tsx

import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { AppProviders } from './src/app/providers/AppProviders';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { useScreenTimeStore } from './src/store/screenTimeStore';
import { useKidsTheme } from './src/theme/ThemeProvider';
import { ParentAdminAuthDialog } from './src/features/parental/ParentAdminAuthDialog';
import { ParentsPasscodeModal } from './src/features/parental/ParentsPasscodeModal';
import { ParentExtensionDialog } from './src/features/parental/ParentExtensionDialog';
import { AlmostTimeDialog } from './src/features/timeout/AlmostTimeDialog';
import { Toast } from './src/components/ui/Toast';
import { AuthMode, ScreenState } from './src/types/navigation';
import {
  navigate,
  resetToParentPanel,
} from './src/app/navigation/navigationRef';
import type { ToastMessage } from './src/components/ui/Toast';

/**
 * KidsStream Root
 * Migrated from Kotlin KidsAppRoot.kt
 * 
 * Orchestrates:
 * - Global auth dialog (PIN/Login/Register/Admin)
 * - Global extension dialog (post-timeout)
 * - Almost-time warning dialog (≤5 min)
 * - Success toast
 * - Lock override (handled in RootNavigator)
 */

const App: React.FC = () => {
  const isLocked = useScreenTimeStore((s) => s.isLocked);
  const remainingMinutes = useScreenTimeStore((s) => s.remainingMinutes);
  const isAlmostTimeWarningShown = useScreenTimeStore(
    (s) => s.isAlmostTimeWarningShown
  );
  const dismissAlmostTimeWarning = useScreenTimeStore(
    (s) => s.dismissAlmostTimeWarning
  );

  // Dialog states
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<AuthMode>(AuthMode.PARENT_LOGIN);
  const [showTimeoutPasscodeModal, setShowTimeoutPasscodeModal] = useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [verifiedPinForExtension, setVerifiedPinForExtension] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  // Almost-time visibility — driven by state
  const almostTimeVisible =
    !isLocked &&
    remainingMinutes >= 1 &&
    remainingMinutes <= 5 &&
    !isAlmostTimeWarningShown;

  const handleParentSettingsClick = (mode?: AuthMode) => {
    if (mode) {
      setAuthDialogMode(mode);
    } else {
      setAuthDialogMode(AuthMode.PARENT_LOGIN);
    }
    setShowAuthDialog(true);
  };

  const handleTimeoutProtectedSettingsClick = () => {
    setShowTimeoutPasscodeModal(true);
  };

  const handleTimeoutPinSuccess = (verifiedPin: string) => {
    setShowTimeoutPasscodeModal(false);
    setVerifiedPinForExtension(verifiedPin);
    setShowExtensionDialog(true);
  };

  const handleOpenParentPanel = () => {
    setShowAuthDialog(false);
    resetToParentPanel();
  };

  const handleOpenAdminPanel = () => {
    setShowAuthDialog(false);
    navigate(ScreenState.ADMIN_PANEL);
  };

  const handleConfirmExtension = async (extensionMinutes: number) => {
    const { grantTemporaryExtensionWithPin } = useScreenTimeStore.getState();
    const result = await grantTemporaryExtensionWithPin(
      verifiedPinForExtension,
      extensionMinutes
    );

    if (result.success) {
      setShowExtensionDialog(false);
      setToastMessage({
        text: `🎉 +${extensionMinutes} minutes added! Have fun watching.`,
        type: 'success',
      });
    } else {
      setToastMessage({
        text: result.error ?? 'Failed to grant extension',
        type: 'error',
      });
    }
  };

  return (
    <AppProviders isNightMode={isLocked ? true : undefined}>
      <ThemedStatusBar />
      <View style={styles.root}>
        <RootNavigator
          onProtectedSettingsClick={handleParentSettingsClick}
          onTimeoutProtectedSettingsClick={handleTimeoutProtectedSettingsClick}
        />

        {/* Success/Error Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* Adult Authentication Dialog (for parent login from child login screen) */}
        <ParentAdminAuthDialog
          visible={showAuthDialog}
          showPinLogin={false}
          initialMode={authDialogMode}
          onDismiss={() => setShowAuthDialog(false)}
          onOpenParentPanel={handleOpenParentPanel}
          onOpenAdminPanel={handleOpenAdminPanel}
        />

        {/* Passcode Modal for Timeout Unlock (Screenshot 3) */}
        <ParentsPasscodeModal
          visible={showTimeoutPasscodeModal}
          onDismiss={() => setShowTimeoutPasscodeModal(false)}
          onSuccess={handleTimeoutPinSuccess}
        />

        {/* Temporary Extension Dialog (Only screen rendered after timeout PIN check) */}
        <ParentExtensionDialog
          visible={showExtensionDialog}
          onDismiss={() => setShowExtensionDialog(false)}
          onConfirmExtension={handleConfirmExtension}
        />

        {/* Almost-Time Warning Dialog */}
        <AlmostTimeDialog
          visible={almostTimeVisible}
          minutesRemaining={remainingMinutes}
          onDismiss={dismissAlmostTimeWarning}
        />
      </View>
    </AppProviders>
  );
};

const ThemedStatusBar: React.FC = () => {
  const { isDark } = useKidsTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;