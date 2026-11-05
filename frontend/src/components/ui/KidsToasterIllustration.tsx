// src/components/ui/KidsToasterIllustration.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * KidsToasterIllustration
 * Cute vector illustration of a red toaster with jumping happy toast
 * matching the YouTube Kids "Your stuff" empty state (Image 3).
 */
export const KidsToasterIllustration: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Sparkles / confetti floating around */}
      <View style={[styles.sparkleDot, { top: 10, left: 30, backgroundColor: '#EF4444' }]} />
      <View style={[styles.sparkleDot, { top: 25, right: 40, backgroundColor: '#3B82F6' }]} />
      <View style={[styles.sparkleDot, { top: 5, right: 70, backgroundColor: '#F59E0B' }]} />
      <View style={[styles.sparkleDot, { top: 60, left: 15, backgroundColor: '#10B981' }]} />

      {/* Jumping Toast (Top) */}
      <View style={styles.jumpingToastWrap}>
        {/* Motion Arc Lines */}
        <View style={styles.motionArcLeft} />
        <View style={styles.motionArcRight} />

        {/* Toast Body */}
        <View style={styles.toastBody}>
          {/* Toast Ears / Top Bulges */}
          <View style={styles.toastEarRow}>
            <View style={styles.toastEar} />
            <View style={styles.toastEar} />
          </View>
          {/* Toast Face */}
          <View style={styles.toastFace}>
            <View style={styles.toastEyes}>
              <View style={styles.toastEye} />
              <View style={styles.toastEye} />
            </View>
            <View style={styles.toastMouthHappy} />
          </View>

          {/* Toast Sprinkles */}
          <View style={[styles.sprinkle, { top: 8, left: 12, backgroundColor: '#EF4444', transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.sprinkle, { top: 14, right: 10, backgroundColor: '#3B82F6', transform: [{ rotate: '-30deg' }] }]} />
          <View style={[styles.sprinkle, { bottom: 10, left: 16, backgroundColor: '#10B981', transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.sprinkle, { bottom: 8, right: 14, backgroundColor: '#F59E0B', transform: [{ rotate: '-15deg' }] }]} />

          {/* Little arms */}
          <View style={styles.toastArmLeft} />
          <View style={styles.toastArmRight} />
        </View>
      </View>

      {/* Main Base Area: Toaster + Sitting Grumpy Toast */}
      <View style={styles.baseRow}>
        {/* Sitting Toast (Left of Toaster) */}
        <View style={styles.sittingToast}>
          <View style={styles.sittingToastBody}>
            <View style={styles.sittingEarRow}>
              <View style={styles.sittingEar} />
              <View style={styles.sittingEar} />
            </View>
            {/* Butter square */}
            <View style={styles.butterSquare} />
            {/* Grumpy / tired face */}
            <View style={styles.sittingEyes}>
              <View style={styles.sittingEye} />
              <View style={styles.sittingEye} />
            </View>
            <View style={styles.sittingMouth} />
            {/* Crumb marks */}
            <View style={[styles.crumbMark, { top: 28, left: 6 }]} />
            <View style={[styles.crumbMark, { bottom: 10, right: 6 }]} />
          </View>
          {/* Sitting feet */}
          <View style={styles.sittingFeetRow}>
            <View style={styles.sittingFoot} />
            <View style={styles.sittingFoot} />
          </View>
        </View>

        {/* Red Toaster (Center-Right) */}
        <View style={styles.toasterWrap}>
          {/* Top Slot */}
          <View style={styles.toasterSlot} />

          {/* Main Red Body */}
          <View style={styles.toasterBody}>
            {/* Highlight Shine curve */}
            <View style={styles.toasterShine} />

            {/* Toaster Door / Accent panel */}
            <View style={styles.toasterDoor}>
              <View style={styles.toasterKnob} />
            </View>

            {/* Lever knob on side */}
            <View style={styles.toasterLever} />
          </View>

          {/* Purple Toaster Feet */}
          <View style={styles.toasterFeetRow}>
            <View style={styles.toasterFoot} />
            <View style={styles.toasterFoot} />
          </View>
        </View>
      </View>

      {/* Crumbs and pebbles on floor */}
      <View style={styles.floorDetailsRow}>
        <View style={[styles.pebble, { width: 14, height: 9 }]} />
        <View style={[styles.pebble, { width: 10, height: 6 }]} />
        <View style={[styles.pebble, { width: 18, height: 11 }]} />
        <View style={[styles.pebble, { width: 12, height: 7 }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 200,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginVertical: 12,
  },
  sparkleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  jumpingToastWrap: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    zIndex: 5,
  },
  motionArcLeft: {
    position: 'absolute',
    bottom: -10,
    left: -20,
    width: 25,
    height: 35,
    borderLeftWidth: 2.5,
    borderColor: '#78350F',
    borderTopLeftRadius: 30,
    transform: [{ rotate: '-15deg' }],
  },
  motionArcRight: {
    position: 'absolute',
    bottom: -12,
    right: -15,
    width: 20,
    height: 30,
    borderRightWidth: 2,
    borderColor: '#78350F',
    borderTopRightRadius: 25,
    transform: [{ rotate: '15deg' }],
  },
  toastBody: {
    width: 64,
    height: 60,
    backgroundColor: '#FDE047',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#78350F',
    alignItems: 'center',
    position: 'relative',
  },
  toastEarRow: {
    position: 'absolute',
    top: -8,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  toastEar: {
    width: 22,
    height: 14,
    backgroundColor: '#FDE047',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: '#78350F',
  },
  toastFace: {
    marginTop: 18,
    alignItems: 'center',
  },
  toastEyes: {
    flexDirection: 'row',
    gap: 16,
  },
  toastEye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#000000',
  },
  toastMouthHappy: {
    width: 10,
    height: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#78350F',
    marginTop: 4,
  },
  sprinkle: {
    position: 'absolute',
    width: 7,
    height: 3,
    borderRadius: 2,
  },
  toastArmLeft: {
    position: 'absolute',
    top: 22,
    left: -8,
    width: 10,
    height: 12,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#78350F',
    borderTopLeftRadius: 6,
    transform: [{ rotate: '-20deg' }],
  },
  toastArmRight: {
    position: 'absolute',
    top: 22,
    right: -8,
    width: 10,
    height: 12,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#78350F',
    borderTopRightRadius: 6,
    transform: [{ rotate: '20deg' }],
  },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 2,
  },
  sittingToast: {
    alignItems: 'center',
    marginBottom: 4,
  },
  sittingToastBody: {
    width: 52,
    height: 54,
    backgroundColor: '#CA8A04',
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#451A03',
    position: 'relative',
    alignItems: 'center',
  },
  sittingEarRow: {
    position: 'absolute',
    top: -7,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sittingEar: {
    width: 18,
    height: 12,
    backgroundColor: '#CA8A04',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: '#451A03',
  },
  butterSquare: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 12,
    height: 10,
    backgroundColor: '#FEF08A',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#A16207',
    transform: [{ rotate: '12deg' }],
  },
  sittingEyes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  sittingEye: {
    width: 6,
    height: 3,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  sittingMouth: {
    width: 8,
    height: 2,
    backgroundColor: '#000000',
    marginTop: 6,
  },
  crumbMark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#78350F',
  },
  sittingFeetRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: -2,
  },
  sittingFoot: {
    width: 12,
    height: 6,
    backgroundColor: '#A16207',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#451A03',
  },
  toasterWrap: {
    alignItems: 'center',
  },
  toasterSlot: {
    width: 60,
    height: 8,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 2,
    borderColor: '#000000',
  },
  toasterBody: {
    width: 95,
    height: 68,
    backgroundColor: '#E52E2E',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 2.5,
    borderColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  toasterShine: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 75,
    height: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  toasterDoor: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    width: 26,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toasterKnob: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  toasterLever: {
    position: 'absolute',
    top: 24,
    left: -4,
    width: 8,
    height: 16,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  toasterFeetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 75,
    marginTop: -2,
  },
  toasterFoot: {
    width: 14,
    height: 8,
    backgroundColor: '#581C87',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  floorDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  pebble: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
});

