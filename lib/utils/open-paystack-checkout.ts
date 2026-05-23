import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { VerifyDonationApiResult } from '@/lib/api/donations';
import { verifyDonationByReference } from '@/lib/api/donations';

export type PaystackCheckoutResult =
  | { outcome: 'completed'; verifiedResult?: VerifyDonationApiResult | null }
  | { outcome: 'cancelled' }
  | { outcome: 'web_redirect' };

export type OpenPaystackCheckoutOptions = {
  redirectUrl?: string;
  paymentReference?: string;
  skipNavigation?: boolean;
};

/** How often we ask the API if Paystack has confirmed (ms). */
const PAYMENT_POLL_MS = 800;

function navigateToPaymentCallback(reference: string): void {
  router.replace({
    pathname: '/payment/callback',
    params: { reference },
  });
}

/**
 * Poll verify while Paystack is open; dismiss the in-app browser the instant payment succeeds.
 * Uses openBrowserAsync (not openAuthSessionAsync) because dismissBrowser() is reliable on iOS.
 */
function startPaymentConfirmationPoll(
  paymentReference: string,
  onConfirmed: (result: VerifyDonationApiResult) => void
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const result = await verifyDonationByReference(paymentReference);
      if (result.success && !stopped) {
        stopped = true;
        if (timer) clearInterval(timer);
        // Close browser immediately — do not await; Paystack success page should vanish at once.
        void WebBrowser.dismissBrowser();
        onConfirmed(result);
      }
    } catch {
      /* keep polling */
    }
  };

  void tick();
  timer = setInterval(() => void tick(), PAYMENT_POLL_MS);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}

/**
 * Opens Paystack hosted checkout.
 * - Web: same-tab navigation.
 * - Native: in-app browser + auto-close as soon as verify API confirms payment.
 */
export async function openPaystackCheckout(
  paymentUrl: string,
  options?: OpenPaystackCheckoutOptions
): Promise<PaystackCheckoutResult> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.assign(paymentUrl);
    }
    return { outcome: 'web_redirect' };
  }

  const paymentReference = options?.paymentReference?.trim() ?? '';
  const verifiedRef: { value: VerifyDonationApiResult | null } = { value: null };

  const stopPoll = paymentReference
    ? startPaymentConfirmationPoll(paymentReference, (result) => {
        verifiedRef.value = result;
      })
    : null;

  try {
    await WebBrowser.warmUpAsync();
    await WebBrowser.openBrowserAsync(paymentUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      showInRecents: false,
    });
  } finally {
    stopPoll?.();
    void WebBrowser.coolDownAsync();
  }

  if (verifiedRef.value?.success) {
    if (paymentReference && !options?.skipNavigation) {
      navigateToPaymentCallback(paymentReference);
    }
    return { outcome: 'completed', verifiedResult: verifiedRef.value };
  }

  if (paymentReference) {
    const lastChance = await verifyDonationByReference(paymentReference);
    if (lastChance.success) {
      if (!options?.skipNavigation) {
        navigateToPaymentCallback(paymentReference);
      }
      return { outcome: 'completed', verifiedResult: lastChance };
    }
  }

  return { outcome: 'cancelled' };
}
