// src/components/ui/UnderwaterSeabedIllustration.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * UnderwaterSeabedIllustration
 * Line-art seabed illustration with corals, kelp leaves, bubbles, and shells
 * matching the YouTube Kids Search screen empty state (Image 4).
 */
export const UnderwaterSeabedIllustration: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Floating Bubbles */}
      <View style={[styles.bubble, { bottom: 170, left: 70, width: 14, height: 14, borderRadius: 7 }]} />
      <View style={[styles.bubble, { bottom: 195, left: 82, width: 8, height: 8, borderRadius: 4 }]} />
      <View style={[styles.bubble, { bottom: 220, left: 75, width: 18, height: 18, borderRadius: 9 }]} />

      <View style={[styles.bubble, { bottom: 150, right: 90, width: 12, height: 12, borderRadius: 6 }]} />
      <View style={[styles.bubble, { bottom: 180, right: 80, width: 16, height: 16, borderRadius: 8 }]} />

      {/* Corals / Kelp Leaves sticking out of the seabed */}
      {/* Left Leaf Cluster */}
      <View style={styles.leafClusterLeft}>
        {/* Tall leaf */}
        <View style={styles.kelpLeafTall}>
          <View style={styles.leafVein} />
        </View>
        {/* Medium wavy leaf */}
        <View style={styles.kelpLeafMedium}>
          <View style={styles.leafVein} />
        </View>
        {/* Wavy scalloped coral */}
        <View style={styles.scallopCoral}>
          <View style={styles.scallopBump1} />
          <View style={styles.scallopBump2} />
          <View style={styles.scallopBump3} />
        </View>
      </View>

      {/* Right Coral Cluster */}
      <View style={styles.coralClusterRight}>
        <View style={styles.wavySeaweedRight}>
          <View style={styles.leafVein} />
        </View>
        <View style={styles.shortCoralBranch}>
          <View style={styles.coralTip} />
          <View style={styles.coralTip2} />
        </View>
      </View>

      {/* Seabed Mound (Sandy Hill) */}
      <View style={styles.seabedMound}>
        {/* Sand Pebbles / Texture dots on mound */}
        <View style={styles.pebblesRow}>
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
          <View style={styles.sandDot} />
        </View>

        {/* Small Shells */}
        <View style={styles.shellLeft}>
          <View style={styles.shellSpiral} />
        </View>
        <View style={styles.shellRight}>
          <View style={styles.shellFan} />
        </View>
        <View style={styles.seaGrassTuft}>
          <View style={styles.blade1} />
          <View style={styles.blade2} />
          <View style={styles.blade3} />
        </View>
      </View>
    </View>
  );
};

const BORDER_COLOR = '#0077B6';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    backgroundColor: 'transparent',
  },
  leafClusterLeft: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  kelpLeafTall: {
    width: 48,
    height: 110,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  kelpLeafMedium: {
    width: 40,
    height: 90,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    marginLeft: -14,
    transform: [{ rotate: '8deg' }],
  },
  leafVein: {
    width: 2,
    height: '75%',
    backgroundColor: BORDER_COLOR,
    marginTop: 18,
  },
  scallopCoral: {
    width: 50,
    height: 95,
    marginLeft: -10,
    position: 'relative',
  },
  scallopBump1: {
    position: 'absolute',
    top: 0,
    left: 6,
    width: 32,
    height: 38,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
  },
  scallopBump2: {
    position: 'absolute',
    top: 26,
    left: 0,
    width: 36,
    height: 42,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
  },
  scallopBump3: {
    position: 'absolute',
    top: 50,
    left: 10,
    width: 34,
    height: 38,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
  },
  coralClusterRight: {
    position: 'absolute',
    bottom: 45,
    right: 25,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  wavySeaweedRight: {
    width: 44,
    height: 100,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    transform: [{ rotate: '15deg' }],
  },
  shortCoralBranch: {
    width: 30,
    height: 50,
    position: 'relative',
    marginLeft: -6,
  },
  coralTip: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 14,
    height: 24,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
  },
  coralTip2: {
    position: 'absolute',
    top: 12,
    right: 2,
    width: 14,
    height: 28,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
  },
  seabedMound: {
    width: '120%',
    height: 100,
    marginLeft: '-10%',
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    borderTopWidth: 3,
    borderColor: BORDER_COLOR,
    backgroundColor: '#0096C7',
    position: 'relative',
    paddingTop: 16,
    alignItems: 'center',
    zIndex: 2,
  },
  pebblesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sandDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
  },
  shellLeft: {
    position: 'absolute',
    top: 35,
    left: '25%',
  },
  shellSpiral: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
  },
  shellRight: {
    position: 'absolute',
    top: 32,
    right: '25%',
  },
  shellFan: {
    width: 18,
    height: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
  },
  seaGrassTuft: {
    position: 'absolute',
    top: 48,
    left: '60%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  blade1: {
    width: 2,
    height: 14,
    backgroundColor: BORDER_COLOR,
    transform: [{ rotate: '-20deg' }],
  },
  blade2: {
    width: 2,
    height: 18,
    backgroundColor: BORDER_COLOR,
  },
  blade3: {
    width: 2,
    height: 12,
    backgroundColor: BORDER_COLOR,
    transform: [{ rotate: '25deg' }],
  },
});

