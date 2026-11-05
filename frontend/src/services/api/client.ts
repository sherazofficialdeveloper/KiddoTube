// src/services/api/client.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getActiveBaseUrl,
  getLocalApiBaseUrl,
  getProductionApiBaseUrl,
  API_CONFIG,
} from '../../app/config/env';

/**
 * KidsStream API Client
 * Migrated from Kotlin ApiClient.kt (Retrofit + OkHttp)
 * 
 * Features:
 * - Centralized base URL
 * - Request/Response interceptors (auth token injection)
 * - Timeout handling
 * - Error normalization
 */

let tokenProvider: (() => string | null) | null = null;

/**
 * Register token provider — called by store to inject auth token
 * This replaces Kotlin's manual `@Header("Authorization")` on every call
 */
export const setTokenProvider = (provider: () => string | null): void => {
  tokenProvider = provider;
};

/**
 * Create the main Axios instance
 * Maps to Retrofit.Builder() in Kotlin
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getActiveBaseUrl(),
    timeout: API_CONFIG.readTimeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor — inject auth token
  // Maps to OkHttp logging + auth interceptor
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (config.headers.Authorization) {
        return config;
      }
      let token: string | null = null;
      if (tokenProvider) {
        try {
          token = tokenProvider();
        } catch {}
      }
      if (!token) {
        try {
          const { secureStorage } = require('../storage/secureStorage');
          token =
            (await secureStorage.getParentToken()) ||
            (await secureStorage.getAdminToken()) ||
            (await secureStorage.getChildToken());
        } catch {}
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Response interceptor — normalize errors
  // Maps to Retrofit error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Network timeout
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return Promise.reject(
          new Error('Server connection timed out. Please check your network.')
        );
      }

      // Network unreachable
      if (!error.response) {
        return Promise.reject(
          new Error(
            'Unable to connect to safety server. Please check your network connection!'
          )
        );
      }

      // Server returned error status
      const status = error.response.status;
      const data = error.response.data as any;

      // Normalize error message from backend
      const message =
        data?.error ||
        data?.message ||
        `Request failed with status ${status}`;

      return Promise.reject(new Error(message));
    }
  );

  return client;
};

/**
 * Main API client instance
 */
export const apiClient: AxiosInstance = createApiClient();

/**
 * Fallback / Local Development Client (configured from .env)
 * Maps to Kotlin fallbackApiService
 */
export const fallbackClient: AxiosInstance = axios.create({
  baseURL: getLocalApiBaseUrl(),
  timeout: API_CONFIG.readTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Dedicated Production Client instance (configured from .env)
 */
export const productionClient: AxiosInstance = axios.create({
  baseURL: getProductionApiBaseUrl(),
  timeout: API_CONFIG.readTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});