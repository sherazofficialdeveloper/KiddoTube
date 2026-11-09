// src/utils/responsive.ts
import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base guidelines based on standard phone (e.g. 375x812)
const BASE_WIDTH = 375;

export const isTabletDevice = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  if (pixelDensity < 2 && (SCREEN_WIDTH >= 600 || SCREEN_HEIGHT >= 600)) {
    return true;
  }
  return adjustedWidth >= 1000 && adjustedHeight >= 1000;
};

export const isSmallPhoneDevice = (): boolean => {
  return SCREEN_WIDTH < 360;
};

export const scale = (size: number): number => {
  const scaleFactor = Math.min(SCREEN_WIDTH / BASE_WIDTH, 1.4);
  return Math.round(size * scaleFactor);
};

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 600 || (isLandscape && width >= 900);
  const isSmallPhone = width < 360;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isSmallPhone,
    contentMaxWidth: isTablet ? 720 : '100%',
    numColumns: isTablet ? 2 : 1,
  };
};

