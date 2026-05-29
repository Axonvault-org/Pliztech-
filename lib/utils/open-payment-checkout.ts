import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { VerifyDonationApiResult } from '@/lib/api/donations';
import {
  verifyDonationByReference,
  waitForDonationVerification,
} from '@/lib/api/donations';
import {
  referenceFromPaymentRedirectUrl,
  transactionIdFromPaymentRedirectUrl,
} from '@/lib/donation/payment-callback-url';

export type PaymentCheckoutResult =
  | { outcome: 'completed'; verifiedResult?: VerifyDonationApiResult | null }
  | { outcome: 'cancelled' }
  | { outcome: 'web_redirect' };

export type OpenPaymentCheckoutOptions = {
  redirectUrl?: string;
  paymentReference?: string;
  skipNavigation?: boolean;
  onStatusChange?: (status: 'opening' | 'redirected' | 'confirming' | 'confirmed') => void;
};

/** Avoid hammering /api/donations/verify — shares backend rate-limit budget in dev. */
const PAYMENT_POLL_MS = 2500;

function navigateToPaymentCallback(reference: string): void {
  router.replace({
    pathname: '/payment/callback',
    params: { reference },
  });
}

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
 * Opens hosted payment checkout (Flutterwave).
 * - Web: same-tab navigation (returns via HTTPS /payment/callback).
 * - Native: in-app browser + verify polling; resolves as soon as the server confirms.
 */
export async function openPaymentCheckout(
  paymentUrl: string,
  options?: OpenPaymentCheckoutOptions
): Promise<PaymentCheckoutResult> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.assign(paymentUrl);
    }
    return { outcome: 'web_redirect' };
  }

  const paymentReference = options?.paymentReference?.trim() ?? '';
  const redirectUrl = options?.redirectUrl?.trim() ?? '';
  const verifiedRef: { value: VerifyDonationApiResult | null } = { value: null };

  return new Promise<PaymentCheckoutResult>((resolve) => {
    let settled = false;

    const finish = (result: PaymentCheckoutResult) => {
      if (settled) return;
      settled = true;
      stopPoll?.();
      void WebBrowser.coolDownAsync();
      resolve(result);
    };

    const finishIfVerified = () => {
      if (verifiedRef.value?.success) {
        if (paymentReference && !options?.skipNavigation) {
          navigateToPaymentCallback(paymentReference);
        }
        finish({ outcome: 'completed', verifiedResult: verifiedRef.value });
        return true;
      }
      return false;
    };

    const stopPoll = paymentReference
      ? startPaymentConfirmationPoll(paymentReference, (result) => {
          verifiedRef.value = result;
          options?.onStatusChange?.('confirmed');
          finishIfVerified();
        })
      : null;

    void (async () => {
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

        if (finishIfVerified()) return;

        if (browserResult.type === 'success' && 'url' in browserResult) {
          options?.onStatusChange?.('redirected');
          const redirectedReference = referenceFromPaymentRedirectUrl(browserResult.url);
          const redirectedTransactionId = transactionIdFromPaymentRedirectUrl(browserResult.url);
          if (
            paymentReference &&
            redirectedReference &&
            redirectedReference !== paymentReference
          ) {
            finish({ outcome: 'cancelled' });
            return;
          }
          if (redirectedTransactionId && paymentReference) {
            const result = await verifyDonationByReference(paymentReference, {
              transactionId: redirectedTransactionId,
            });
            if (result.success) {
              verifiedRef.value = result;
            }
          }
        }

        if (finishIfVerified()) return;

        if (paymentReference) {
          options?.onStatusChange?.('confirming');
          const confirmed = await waitForDonationVerification(paymentReference);
          if (confirmed) {
            verifiedRef.value = confirmed;
            options?.onStatusChange?.('confirmed');
          }
        }

        if (finishIfVerified()) return;

        finish({ outcome: 'cancelled' });
      } catch {
        if (finishIfVerified()) return;
        finish({ outcome: 'cancelled' });
      }
    })();
  });
}

/** @deprecated Use openPaymentCheckout */
export type PaystackCheckoutResult = PaymentCheckoutResult;
export type OpenPaystackCheckoutOptions = OpenPaymentCheckoutOptions;
export const openPaystackCheckout = openPaymentCheckout;
