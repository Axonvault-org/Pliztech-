import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const CALLBACK_PATH = '/payment/callback';

/** HTTPS callback for web payment redirects (must match backend FRONTEND_URL). */
export function getPaymentWebCallbackUrl(): string {
  // Prefer the live browser origin so production web works even when the static
  // export was built without EXPO_PUBLIC_FRONTEND_URL (e.g. Vercel env missing).
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}${CALLBACK_PATH}`;
  }

  const base = (
    process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() ||
    (__DEV__ ? 'http://localhost:8081' : 'https://app.plz.ng')
  ).replace(/\/$/, '');
  return `${base}${CALLBACK_PATH}`;
}

/** Native deep link (`plz://` / `exp://`) for in-app browser return. */
export function getPaymentNativeCallbackUrl(): string {
  return Linking.createURL(CALLBACK_PATH);
}

/**
 * Callback URL sent to POST /api/donations/initialize.
 * Native checkout returns to the app so the in-app browser can close automatically.
 */
export function getPaymentDonationCallbackUrl(): string | undefined {
  if (Platform.OS === 'web') return undefined;
  return getPaymentNativeCallbackUrl();
}

export function referenceFromPaymentRedirectUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const ref =
    parsed.queryParams?.tx_ref ??
    parsed.queryParams?.reference ??
    parsed.queryParams?.trxref;
  if (typeof ref === 'string' && ref.trim()) return ref.trim();
  if (Array.isArray(ref) && ref[0]) return String(ref[0]).trim();
  return null;
}

export function transactionIdFromPaymentRedirectUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const id = parsed.queryParams?.transaction_id ?? parsed.queryParams?.transactionId;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (Array.isArray(id) && id[0]) return String(id[0]).trim();
  return null;
}

/** @deprecated Use payment-callback-url helpers */
export const getPaystackWebCallbackUrl = getPaymentWebCallbackUrl;
export const getPaystackNativeCallbackUrl = getPaymentNativeCallbackUrl;
export const getPaystackDonationCallbackUrl = getPaymentDonationCallbackUrl;
export const referenceFromPaystackRedirectUrl = referenceFromPaymentRedirectUrl;
