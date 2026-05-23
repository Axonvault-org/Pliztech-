import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'pliz_pending_paystack_checkout';

export type PendingPaystackCheckout = {
  version: 1;
  reference: string;
  paymentUrl: string;
  redirectUrl?: string;
};

function webGetItem(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function webSetItem(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
}

function webRemoveItem(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export async function savePendingPaystackCheckout(
  data: Omit<PendingPaystackCheckout, 'version'>
): Promise<void> {
  const payload: PendingPaystackCheckout = { ...data, version: 1 };
  const json = JSON.stringify(payload);
  if (Platform.OS === 'web') {
    webSetItem(json);
    return;
  }
  await SecureStore.setItemAsync(KEY, json);
}

export async function readPendingPaystackCheckout(
  reference: string
): Promise<PendingPaystackCheckout | null> {
  let raw: string | null;
  try {
    raw = Platform.OS === 'web' ? webGetItem() : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPaystackCheckout>;
    if (
      parsed?.version !== 1 ||
      parsed.reference !== reference ||
      typeof parsed.paymentUrl !== 'string'
    ) {
      return null;
    }
    return parsed as PendingPaystackCheckout;
  } catch {
    return null;
  }
}

export async function clearPendingPaystackCheckout(): Promise<void> {
  if (Platform.OS === 'web') {
    webRemoveItem();
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}
