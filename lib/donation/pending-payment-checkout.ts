import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'pliz_pending_payment_checkout';
const LEGACY_KEY = 'pliz_pending_paystack_checkout';

export type PendingPaymentCheckout = {
  version: 1;
  reference: string;
  paymentUrl: string;
  redirectUrl?: string;
};

function webGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function webRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

async function readRaw(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return webGetItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webSetItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webRemoveItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export async function savePendingPaymentCheckout(
  data: Omit<PendingPaymentCheckout, 'version'>
): Promise<void> {
  const payload: PendingPaymentCheckout = { ...data, version: 1 };
  const json = JSON.stringify(payload);
  await writeRaw(KEY, json);
  await removeRaw(LEGACY_KEY);
}

export async function readPendingPaymentCheckout(
  reference: string
): Promise<PendingPaymentCheckout | null> {
  for (const key of [KEY, LEGACY_KEY]) {
    const raw = await readRaw(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<PendingPaymentCheckout>;
      if (
        parsed?.version !== 1 ||
        parsed.reference !== reference ||
        typeof parsed.paymentUrl !== 'string'
      ) {
        continue;
      }
      return parsed as PendingPaymentCheckout;
    } catch {
      continue;
    }
  }
  return null;
}

export async function clearPendingPaymentCheckout(): Promise<void> {
  await removeRaw(KEY);
  await removeRaw(LEGACY_KEY);
}

/** @deprecated */
export type PendingPaystackCheckout = PendingPaymentCheckout;
export const savePendingPaystackCheckout = savePendingPaymentCheckout;
export const readPendingPaystackCheckout = readPendingPaymentCheckout;
export const clearPendingPaystackCheckout = clearPendingPaymentCheckout;
