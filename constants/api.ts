import { Platform } from 'react-native';

/**
 * Android emulator: `localhost` is the emulator itself — use the host loopback alias.
 * Physical Android device: set EXPO_PUBLIC_API_BASE_URL to your Mac's LAN IP (e.g. http://192.168.x.x:3000).
 */
function resolveApiBaseUrl(): string {
  const raw = (
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, '');

  if (Platform.OS === 'android') {
    return raw
      .replace(/\/\/localhost\b/i, '//10.0.2.2')
      .replace(/\/\/127\.0\.0\.1\b/, '//10.0.2.2');
  }

  return raw;
}

/**
 * Plz REST API base URL (no trailing slash).
 * Set EXPO_PUBLIC_API_BASE_URL in .env — restart Expo after changes.
 */
export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
