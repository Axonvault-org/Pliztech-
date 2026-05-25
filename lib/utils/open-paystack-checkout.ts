import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { VerifyDonationApiResult } from '@/lib/api/donations';
import {
  verifyDonationByReference,
  waitForDonationVerification,
} from '@/lib/api/donations';
import { referenceFromPaystackRedirectUrl } from '@/lib/donation/paystack-callback-url';

export type PaystackCheckoutResult =
  | { outcome: 'completed'; verifiedResult?: VerifyDonationApiResult | null }
  | { outcome: 'cancelled' }
  | { outcome: 'web_redirect' };

export type OpenPaystackCheckoutOptions = {
  redirectUrl?: string;
  paymentReference?: string;
  skipNavigation?: boolean;
  onStatusChange?: (status: 'opening' | 'redirected' | 'confirming' | 'confirmed') => void;
};

/** Poll interval while Paystack in-app browser is open. */
const PAYMENT_POLL_MS = 600;

function navigateToPaymentCallback(reference: string): void {
  router.replace({
    pathname: '/payment/callback',
    params: { reference },
  });
}

/**
 * Poll verify while Paystack is open; dismiss the in-app browser the instant payment succeeds.
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
        try {
          WebBrowser.dismissAuthSession();
        } catch {
          void WebBrowser.dismissBrowser();
        }
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
 * - Web: same-tab navigation to Paystack (returns via HTTPS /payment/callback).
 * - Native: in-app browser + verify polling; auto-closes when payment confirms.
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
  const redirectUrl = options?.redirectUrl?.trim() ?? '';
  const verifiedRef: { value: VerifyDonationApiResult | null } = { value: null };

  const stopPoll = paymentReference
    ? startPaymentConfirmationPoll(paymentReference, (result) => {
        verifiedRef.value = result;
        options?.onStatusChange?.('confirmed');
      })
    : null;

  try {
    options?.onStatusChange?.('opening');
    await WebBrowser.warmUpAsync();
    const browserResult = redirectUrl
      ? await WebBrowser.openAuthSessionAsync(paymentUrl, redirectUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          showInRecents: false,
          enableBarCollapsing: false,
        })
      : await WebBrowser.openBrowserAsync(paymentUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          showInRecents: false,
          enableBarCollapsing: false,
        });

    if (browserResult.type === 'success' && 'url' in browserResult) {
      options?.onStatusChange?.('redirected');
      const redirectedReference = referenceFromPaystackRedirectUrl(browserResult.url);
      if (
        paymentReference &&
        redirectedReference &&
        redirectedReference !== paymentReference
      ) {
        return { outcome: 'cancelled' };
      }
    }
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
    options?.onStatusChange?.('confirming');
    const confirmed = await waitForDonationVerification(paymentReference);
    if (confirmed) {
      options?.onStatusChange?.('confirmed');
      if (!options?.skipNavigation) {
        navigateToPaymentCallback(paymentReference);
      }
      return { outcome: 'completed', verifiedResult: confirmed };
    }
  }

  return { outcome: 'cancelled' };
}
