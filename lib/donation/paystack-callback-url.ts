import { Platform } from 'react-native';

const CALLBACK_PATH = '/payment/callback';

/**
 * Web URL Paystack redirects the in-app browser to after checkout.
 * Must match backend FRONTEND_URL/payment/callback (browser redirect, not a custom scheme).
 */
export function getPaystackWebCallbackUrl(): string {
  const base = (
    process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() ||
    'http://localhost:8081'
  ).replace(/\/$/, '');
  return `${base}${CALLBACK_PATH}`;
}

/** Sent to POST /api/donations/initialize on native so Paystack uses an HTTPS callback. */
export function getPaystackDonationCallbackUrl(): string | undefined {
  if (Platform.OS === 'web') return undefined;
  return getPaystackWebCallbackUrl();
}
