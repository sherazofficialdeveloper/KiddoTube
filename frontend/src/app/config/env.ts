// src/app/config/env.ts

import { API_BASE_URL, LOCAL_API_BASE_URL, PROD_API_BASE_URL } from '@env';

/**
 * KiddoTube Environment Configuration
 * Single source of truth loaded from .env
 */

const DEFAULT_PROD_URL = 'https://mediumvioletred-bear-195908.hostingersite.com/';
const DEFAULT_LOCAL_URL = 'http://10.0.2.2:4000/';

const normalizeUrl = (url?: string, fallback = DEFAULT_PROD_URL): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

/**
 * Returns the backend API base URL from .env
 */
export const getApiBaseUrl = (): string => {
  return normalizeUrl(API_BASE_URL || PROD_API_BASE_URL || DEFAULT_PROD_URL);
};

export const getActiveBaseUrl = (): string => {
  return activeBaseUrl;
};

export const getLocalApiBaseUrl = (): string => {
  return normalizeUrl(LOCAL_API_BASE_URL || DEFAULT_LOCAL_URL);
};

export const getProductionApiBaseUrl = (): string => {
  return normalizeUrl(PROD_API_BASE_URL || DEFAULT_PROD_URL);
};

let activeBaseUrl: string = getApiBaseUrl();

export const setBaseUrl = (newUrl: string): void => {
  activeBaseUrl = normalizeUrl(newUrl);
};

export const API_CONFIG = {
  connectTimeout: 15000,
  readTimeout: 15000,
  writeTimeout: 15000,
} as const;

export const getPrivacyPolicyUrl = (): string => {
  const base = getApiBaseUrl();
  return `${base}privacy.html`;
};
