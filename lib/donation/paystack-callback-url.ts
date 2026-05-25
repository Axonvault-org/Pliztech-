import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const CALLBACK_PATH = '/payment/callback';

/**
 * HTTPS callback for web Paystack redirects (must match backend FRONTEND_URL).
 */
export function getPaystackWebCallbackUrl(): string {
  const base = (
    process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() ||
    'http://localhost:8081'
  ).replace(/\/$/, '');
  return `${base}${CALLBACK_PATH}`;
}

/**
 * Native deep link (`plz://` / `exp://`) — used when no public HTTPS frontend is configured.
 */
export function getPaystackNativeCallbackUrl(): string {
  return Linking.createURL(CALLBACK_PATH);
}

/**
 * Paystack callback sent to POST /api/donations/initialize.
 * Native checkout should return to the app so the in-app browser can close automatically.
 * Web keeps using the public HTTPS callback.
 */
export function getPaystackDonationCallbackUrl(): string | undefined {
  if (Platform.OS === 'web') return undefined;

  return getPaystackNativeCallbackUrl();
}

export function referenceFromPaystackRedirectUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const ref = parsed.queryParams?.reference ?? parsed.queryParams?.trxref;
  if (typeof ref === 'string' && ref.trim()) return ref.trim();
  if (Array.isArray(ref) && ref[0]) return String(ref[0]).trim();
  return null;
}
