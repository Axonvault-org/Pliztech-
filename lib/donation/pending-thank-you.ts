import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'pliz_pending_donation_thank_you';

export type PendingDonationThankYou = {
  version: 2 | 3 | 4;
  amount: number;
  recipientName: string;
  begId: string;
  donationId?: string;
  paymentReference?: string;
  /** True when donor had “Show my name” on — controls privacy copy in the modal. */
  showRecipientName: boolean;
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
    /* quota / private mode */
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

/**
 * Call before opening Paystack checkout so `/payment/callback` can show the thank-you sheet.
 * Web uses localStorage — expo-secure-store is a no-op stub on web and would throw before redirect.
 */
export async function savePendingDonationThankYou(
  data: Omit<PendingDonationThankYou, 'version'>
): Promise<void> {
  const payload: PendingDonationThankYou = { ...data, version: 4 };
  const json = JSON.stringify(payload);
  if (Platform.OS === 'web') {
    webSetItem(json);
    return;
  }
  await SecureStore.setItemAsync(KEY, json);
}

export async function clearPendingDonationThankYou(): Promise<void> {
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

export async function consumePendingDonationThankYouIfBegMatches(
  begId: string | null | undefined
): Promise<PendingDonationThankYou | null> {
  let raw: string | null;
  try {
    raw = Platform.OS === 'web' ? webGetItem() : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingDonationThankYou>;
    const valid =
      (parsed?.version === 2 ||
        parsed?.version === 3 ||
        parsed?.version === 4) &&
      typeof parsed.amount === 'number' &&
      typeof parsed.recipientName === 'string' &&
      typeof parsed.begId === 'string' &&
      typeof parsed.showRecipientName === 'boolean';

    if (!valid) {
      await clearPendingDonationThankYou();
      return null;
    }

    const pending = parsed as PendingDonationThankYou;

    if (begId && pending.begId !== begId) {
      await clearPendingDonationThankYou();
      return null;
    }

    await clearPendingDonationThankYou();
    return pending;
  } catch {
    await clearPendingDonationThankYou();
    return null;
  }
}
