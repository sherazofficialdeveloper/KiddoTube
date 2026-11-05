
import { ChildFontText as Text } from '../ui/ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  Image,
} from 'react-native';

export type LogoPalette = 'original' | 'playful-lagoon' | 'cozy-sunset';
export type LogoSize = 'small' | 'medium' | 'large' | 'icon-only';

interface KiddoTubeLogoProps {
  size?: LogoSize;
  palette?: LogoPalette;
  showTagline?: boolean;
}

const PALETTES = {
  original: {
    sunYellow: '#FFC93C',
    skyBlue: '#0284C7',
    coral: '#E52E2E',
    navyText: '#000000',
    white: '#FFFFFF',
    taglineColor: '#000000',
  },
  'playful-lagoon': {
    sunYellow: '#FFB703',
    skyBlue: '#0284C7',
    coral: '#E52E2E',
    navyText: '#000000',
    white: '#FFFFFF',
    taglineColor: '#000000',
  },
  'cozy-sunset': {
    sunYellow: '#FDE047',
    skyBlue: '#0284C7',
    coral: '#E52E2E',
    navyText: '#000000',
    white: '#FFFFFF',
    taglineColor: '#000000',
  },
};

const LOGO_IMAGE = require('../../assets/images/KiddoTube_App_Icon.jpg');

export const KiddoTubeLogo: React.FC<KiddoTubeLogoProps> = ({
  size = 'medium',
  palette = 'original',
  showTagline = true,
}) => {
  const p = PALETTES[palette] || PALETTES.original;

  const isIconOnly = size === 'icon-only';
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  // Sizing matching privacy.html logo proportions.
  const badgeSize = isSmall ? 42 : isLarge ? 84 : 54;
  const titleSize = isSmall ? 27 : isLarge ? 38 : 28;
  const taglineSize = isSmall ? 11 : isLarge ? 14 : 12;

  return (
    <View style={styles.container}>
      {/* Logo App Icon */}
      <View
        style={[
          styles.badgeWrap,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize * 0.28,
            shadowColor: p.coral,
          },
        ]}
      >
        <Image
          source={LOGO_IMAGE}
          style={[
            styles.badgeImage,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize * 0.28,
            },
          ]}
          resizeMode="cover"
        />
      </View>

      {/* Typography Lockup: Kiddo + Tube Badge + Tagline */}
      {!isIconOnly && (
        <View style={styles.textColumn}>
          <View style={styles.brandRow}>
            <Text
              style={[
                styles.brandKiddo,
                {
                  fontSize: titleSize,
                  color: p.skyBlue,
                },
              ]}
            >
              Kiddo
            </Text>

            <View
              style={[
                styles.tubeBadge,
                {
                  backgroundColor: p.coral,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.brandTube,
                  {
                    fontSize: Math.round(titleSize * 0.78),
                    color: p.white,
                  },
                ]}
              >
                Tube
              </Text>
            </View>
          </View>

          {showTagline && (
            <Text
              style={[
                styles.tagline,
                {
                  fontSize: taglineSize,
                  color: p.taglineColor,
                },
              ]}
            >
              Hand-picked video
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  badgeWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    backgroundColor: '#FFC93C',
  },

  badgeImage: {
    width: '100%',
    height: '100%',
  },

  textColumn: {
    justifyContent: 'center',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  // Matches privacy.html: Fredoka, weight 700, letter spacing -0.5.
  brandKiddo: {
    fontFamily: 'FredokaBold',
    fontWeight: '800',
    fontStyle: 'normal',
    letterSpacing: -0.5,
  },

  tubeBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Same Fredoka bold typography as Kiddo.
  brandTube: {
    fontFamily: 'FredokaBold',
    fontWeight: '700',
    fontStyle: 'normal',
    letterSpacing: -0.5,
  },

  tagline: {
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
