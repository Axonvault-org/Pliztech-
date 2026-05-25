import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { DonationThankYouModal } from '@/components/donation/DonationThankYouModal';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { verifyDonationByReference, waitForDonationVerification, type VerifyDonationApiResult } from '@/lib/api/donations';
import { consumePendingDonationThankYouIfBegMatches } from '@/lib/donation/pending-thank-you';
import {
  clearPendingPaystackCheckout,
  readPendingPaystackCheckout,
} from '@/lib/donation/pending-paystack-checkout';
import { navigateToRequestDetailAfterDonation } from '@/lib/navigation/post-donation-navigation';
import { openPaystackCheckout } from '@/lib/utils/open-paystack-checkout';

type Phase = 'checkout' | 'loading' | 'success' | 'error';

function firstQuery(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

function isTruthyFlag(value: string | string[] | undefined): boolean {
  const v = firstQuery(value);
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Paystack donation return flow:
 * - Mobile: request screen navigates here with `checkout=1`, opens Paystack, then verifies.
 * - Web: Paystack redirects here with `reference` / `trxref` query params.
 */
export default function PaymentCallbackScreen() {
  const params = useLocalSearchParams<{
    reference?: string;
    trxref?: string;
    checkout?: string;
  }>();

  const reference = useMemo(() => {
    const ref = firstQuery(params.reference);
    const trx = firstQuery(params.trxref);
    return ref || trx;
  }, [params.reference, params.trxref]);

  const shouldOpenCheckout = isTruthyFlag(params.checkout);

  const [phase, setPhase] = useState<Phase>(
    shouldOpenCheckout && reference ? 'checkout' : reference ? 'loading' : 'error'
  );
  const [message, setMessage] = useState('');
  const [begId, setBegId] = useState<string | null>(null);
  const [thankYouSheet, setThankYouSheet] = useState<{
    amount: number;
    recipientName: string;
    showRecipientName: boolean;
    donationId?: string;
  } | null>(null);

  const checkoutStarted = useRef(false);

  const applyVerifyResult = useCallback(async (result: VerifyDonationApiResult) => {
    if (result.success) {
      const verifiedBegId = result.data?.begId ?? null;
      setBegId(verifiedBegId);
      const pending = await consumePendingDonationThankYouIfBegMatches(verifiedBegId);
      if (pending) {
        setThankYouSheet({
          amount: pending.amount,
          recipientName: pending.recipientName,
          showRecipientName: pending.showRecipientName,
          donationId: pending.donationId,
        });
      } else if (typeof result.data?.amount === 'number') {
        setThankYouSheet({
          amount: result.data.amount,
          recipientName: 'the recipient',
          showRecipientName: true,
        });
      }
      setPhase('success');
      setMessage(result.message || 'Thank you! Your donation was recorded.');
    } else {
      setPhase('error');
      setMessage(
        result.message ||
          'We could not confirm this payment. If you were charged, contact support with your reference.'
      );
    }
  }, []);

  const runVerify = useCallback(async () => {
    if (!reference) {
      setPhase('error');
      setMessage(
        'Missing payment reference. If you completed a payment, open the app from your email receipt or try again from the request page.'
      );
      return;
    }

    setPhase('loading');
    setMessage('Confirming your payment…');

    const result = await waitForDonationVerification(reference, {
      maxAttempts: 12,
      intervalMs: 1000,
    });
    if (result) {
      await applyVerifyResult(result);
      return;
    }

    const lastTry = await verifyDonationByReference(reference);
    await applyVerifyResult(lastTry);
  }, [reference, applyVerifyResult]);

  useEffect(() => {
    if (!shouldOpenCheckout || !reference || checkoutStarted.current) return;
    checkoutStarted.current = true;

    let cancelled = false;

    void (async () => {
      setPhase('checkout');
      setMessage('Opening secure payment…');

      const pending = await readPendingPaystackCheckout(reference);
      if (cancelled) return;

      if (!pending) {
        setPhase('error');
        setMessage('Payment session expired. Please go back and try again.');
        return;
      }

      const checkoutResult = await openPaystackCheckout(pending.paymentUrl, {
        redirectUrl: pending.redirectUrl,
        paymentReference: reference,
        skipNavigation: true,
      });

      if (cancelled) return;
      await clearPendingPaystackCheckout();

      if (
        checkoutResult.outcome === 'completed' &&
        checkoutResult.verifiedResult?.success
      ) {
        await applyVerifyResult(checkoutResult.verifiedResult);
        return;
      }

      if (checkoutResult.outcome === 'completed') {
        await runVerify();
        return;
      }

      if (checkoutResult.outcome === 'cancelled') {
        const retried = await waitForDonationVerification(reference, {
          maxAttempts: 6,
          intervalMs: 1000,
        });
        if (retried) {
          await applyVerifyResult(retried);
          return;
        }
      }

      setPhase('error');
      setMessage(
        'We could not confirm this payment yet. If Paystack showed success, wait a moment and open the request again — or contact support with your reference.'
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldOpenCheckout, reference, runVerify, applyVerifyResult]);

  useEffect(() => {
    if (shouldOpenCheckout || !reference) return;
    void runVerify();
  }, [shouldOpenCheckout, reference, runVerify]);

  const goHome = useCallback(() => {
    router.replace('/(tabs)/(main)');
  }, []);

  const viewRequest = useCallback(() => {
    if (begId) {
      navigateToRequestDetailAfterDonation(begId);
    } else {
      goHome();
    }
  }, [begId, goHome]);

  const onThankYouDone = useCallback(() => {
    setThankYouSheet(null);
    viewRequest();
  }, [viewRequest]);

  const showThankYouModal = thankYouSheet != null;
  const showStatusCard =
    phase === 'checkout' || phase === 'loading' || (phase === 'success' && !showThankYouModal) || phase === 'error';

  return (
    <Screen backgroundColor="#FFFFFF" centerVertical>
      <DonationThankYouModal
        visible={showThankYouModal}
        amount={thankYouSheet?.amount ?? 0}
        recipientName={thankYouSheet?.recipientName ?? ''}
        showRecipientName={thankYouSheet?.showRecipientName ?? true}
        donationId={thankYouSheet?.donationId}
        onDone={onThankYouDone}
      />

      {showStatusCard ? (
        <View style={styles.card}>
          {phase === 'checkout' || phase === 'loading' ? (
            <>
              <ActivityIndicator size="large" color="#2E8BEA" />
              <Text style={styles.title}>
                {phase === 'checkout' ? 'Secure payment' : 'Processing'}
              </Text>
              <Text style={styles.body}>
                {phase === 'checkout'
                  ? 'Complete your payment in Paystack. You will return here when finished.'
                  : message}
              </Text>
            </>
          ) : phase === 'success' ? (
            <>
              <Text style={styles.emoji}>✓</Text>
              <Text style={styles.title}>Payment successful</Text>
              <Text style={styles.body}>{message}</Text>
              {reference ? (
                <Text style={styles.ref} selectable>
                  Reference: {reference}
                </Text>
              ) : null}
              <Pressable
                style={styles.primaryBtn}
                onPress={viewRequest}
                accessibilityRole="button"
                accessibilityLabel={begId ? 'View request' : 'Back to home'}
              >
                <Text style={styles.primaryBtnLabel}>
                  {begId ? 'View request' : 'Back to home'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={goHome}
                accessibilityRole="button"
                accessibilityLabel="Go to home feed"
              >
                <Text style={styles.secondaryBtnLabel}>Home</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>!</Text>
              <Text style={styles.title}>Payment not confirmed</Text>
              <Text style={styles.body}>{message}</Text>
              {reference ? (
                <Text style={styles.ref} selectable>
                  Reference: {reference}
                </Text>
              ) : null}
              <Pressable
                style={styles.supportBtn}
                onPress={() => router.push('/(tabs)/report-issue' as import('expo-router').Href)}
                accessibilityRole="button"
                accessibilityLabel="Contact support"
              >
                <Text style={styles.supportBtnLabel}>Contact support</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtn}
                onPress={goHome}
                accessibilityRole="button"
                accessibilityLabel="Back to home"
              >
                <Text style={styles.primaryBtnLabel}>Back to home</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
    color: '#2E8BEA',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  ref: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#2E8BEA',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  supportBtn: {
    borderWidth: 1,
    borderColor: '#2E8BEA',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 12,
  },
  supportBtnLabel: {
    color: '#2E8BEA',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnLabel: {
    color: '#2E8BEA',
    fontSize: 16,
    fontWeight: '600',
  },
});
