import * as SecureStore from 'expo-secure-store';

import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

const ACCESS_KEY = 'pliz_access_token';
const REFRESH_KEY = 'pliz_refresh_token';

/**
 * Web: access token in memory + sessionStorage so a full reload (or payment return URL) still has
 * a Bearer until refresh runs. Refresh token stays in an httpOnly cookie from the API (not JS).
 * New tabs rely on cookie-based refresh (COOKIE_DOMAIN on the API), not shared access storage.
 */
let webAccessToken: string | null = null;
let webRefreshToken: string | null = null;

function readWebAccessFromSessionStorage(): string | null {
  if (typeof globalThis.sessionStorage === 'undefined') return null;
  try {
    return globalThis.sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (isWebAuthEnvironment()) {
    if (webAccessToken) return webAccessToken;
    const fromSession = readWebAccessFromSessionStorage();
    if (fromSession) {
      webAccessToken = fromSession;
      return fromSession;
    }
    return null;
  }
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (isWebAuthEnvironment()) {
    return webRefreshToken;
  }
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (isWebAuthEnvironment()) {
    webAccessToken = accessToken;
    webRefreshToken = null;
    try {
      globalThis.sessionStorage?.setItem(ACCESS_KEY, accessToken);
    } catch {
      /* ignore quota / private mode */
    }
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  if (isWebAuthEnvironment()) {
    webAccessToken = null;
    webRefreshToken = null;
    try {
      globalThis.sessionStorage?.removeItem(ACCESS_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
  } catch {
    /* ignore */
  }
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
