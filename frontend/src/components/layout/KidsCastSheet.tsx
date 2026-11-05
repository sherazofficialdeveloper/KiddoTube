// src/components/layout/KidsCastSheet.tsx
import { ChildFontText as Text } from '../ui/ChildFontText';

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

/**
 * KidsCastSheet
 * Cloned directly from YouTube Kids "Select a device" sheet.
 * 
 * Purpose:
 * Allows kids & parents to wirelessly cast/stream videos from this device
 * to a Living Room TV, Bedroom Android TV, or Chromecast on the local Wi-Fi.
 */

interface DeviceItem {
  id: string;
  name: string;
  type: 'tv' | 'chromecast' | 'tablet';
  location: string;
}

const AVAILABLE_DEVICES: DeviceItem[] = [
  { id: 'dev_1', name: 'Living Room Android TV', type: 'tv', location: 'Living Room' },
  { id: 'dev_2', name: 'Kids Bedroom Smart TV', type: 'tv', location: 'Bedroom' },
  { id: 'dev_3', name: 'Family Room Chromecast', type: 'chromecast', location: 'Family Hall' },
  { id: 'dev_local', name: 'This Tablet (Current Device)', type: 'tablet', location: 'Local Playback' },
];

interface KidsCastSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export const KidsCastSheet: React.FC<KidsCastSheetProps> = ({
  visible,
  onDismiss,
}) => {
  const [connectedDeviceId, setConnectedDeviceId] = useState<string>('dev_local');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleSelectDevice = (device: DeviceItem) => {
    if (device.id === connectedDeviceId) return;

    setConnectingId(device.id);
    setTimeout(() => {
      setConnectedDeviceId(device.id);
      setConnectingId(null);
    }, 1200);
  };

  const handleDisconnect = () => {
    setConnectedDeviceId('dev_local');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer} testID="cast_device_sheet">
              {/* Top drag handle indicator */}
              <View style={styles.handleBar} />

              {/* Title row */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Select a device</Text>
                  <Text style={styles.subtitle}>
                    Cast videos directly to your Smart TV or Chromecast
                  </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeIconBtn} accessibilityLabel="Close cast modal">
                  <MaterialIcons name="close" size={24} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Connected Status Banner */}
              {connectedDeviceId !== 'dev_local' && (
                <View style={styles.connectedBanner}>
                  <MaterialIcons name="cast-connected" size={20} color="#059669" />
                  <Text style={styles.connectedBannerText}>
                    Streaming to:{' '}
                    {AVAILABLE_DEVICES.find((d) => d.id === connectedDeviceId)?.name}
                  </Text>
                  <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Device List */}
              <View style={styles.deviceList}>
                {AVAILABLE_DEVICES.map((device) => {
                  const isConnected = connectedDeviceId === device.id;
                  const isConnecting = connectingId === device.id;

                  return (
                    <TouchableOpacity
                      key={device.id}
                      style={[
                        styles.deviceRow,
                        isConnected && styles.deviceRowConnected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectDevice(device)}
                      disabled={isConnecting}
                    >
                      <View
                        style={[
                          styles.deviceIconCircle,
                          isConnected && styles.deviceIconCircleActive,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            device.type === 'tv'
                              ? 'tv'
                              : device.type === 'chromecast'
                              ? 'cast'
                              : 'tablet-android'
                          }
                          size={22}
                          color={isConnected ? '#FFFFFF' : '#475569'}
                        />
                      </View>

                      <View style={styles.deviceInfo}>
                        <Text
                          style={[
                            styles.deviceName,
                            isConnected && styles.deviceNameActive,
                          ]}
                        >
                          {device.name}
                        </Text>
                        <Text style={styles.deviceLocation}>{device.location}</Text>
                      </View>

                      {isConnecting ? (
                        <ActivityIndicator size="small" color="#0284C7" />
                      ) : isConnected ? (
                        <View style={styles.connectedBadge}>
                          <MaterialIcons name="check-circle" size={18} color="#059669" />
                          <Text style={styles.connectedBadgeText}>Active</Text>
                        </View>
                      ) : (
                        <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  connectedBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 8,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deviceList: {
    marginTop: 6,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  deviceRowConnected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  deviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconCircleActive: {
    backgroundColor: '#0284C7',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  deviceNameActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  deviceLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
});
