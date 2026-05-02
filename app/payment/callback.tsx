import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { DonationThankYouModal } from '@/components/donation/DonationThankYouModal';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { consumePendingDonationThankYouIfBegMatches } from '@/lib/donation/pending-thank-you';
import { verifyDonationByReference } from '@/lib/api/donations';
import { navigateToBegDetailOrPastOverlay } from '@/lib/navigation/post-donation-navigation';

type Phase = 'loading' | 'success' | 'error';

function firstQuery(
  value: string | string[] | undefined
): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

/**
 * Paystack appends `reference` and `trxref` to `callback_url` after checkout.
 * Set Paystack `callback_url` to: `{FRONTEND_URL}/payment/callback`
 * This screen calls `GET /api/donations/verify?reference=...` on your API.
 */
export default function PaymentCallbackScreen() {
  const params = useLocalSearchParams<{
    reference?: string;
    trxref?: string;
  }>();

  const reference = useMemo(() => {
    const ref = firstQuery(params.reference);
    const trx = firstQuery(params.trxref);
    return ref || trx;
  }, [params.reference, params.trxref]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState('');
  const [begId, setBegId] = useState<string | null>(null);
  const [thankYouSheet, setThankYouSheet] = useState<{
    amount: number;
    recipientName: string;
    showRecipientName: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!reference) {
        setPhase('error');
        setMessage(
          'Missing payment reference. If you completed a payment, open the app from your email receipt or try again from the request page.'
        );
        return;
      }

      setPhase('loading');
      setMessage('Confirming your payment…');

      const result = await verifyDonationByReference(reference);
      if (cancelled) return;

      if (result.success) {
        const verifiedBegId = result.data?.begId ?? null;
        setBegId(verifiedBegId);
        const pending = await consumePendingDonationThankYouIfBegMatches(verifiedBegId);
        if (pending) {
          setThankYouSheet({
            amount: pending.amount,
            recipientName: pending.recipientName,
            showRecipientName: pending.showRecipientName,
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
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const goHome = useCallback(() => {
    router.replace('/(tabs)/(main)');
  }, []);

  const viewRequest = useCallback(() => {
    if (begId) {
      void navigateToBegDetailOrPastOverlay(begId, { ensureHomeBehindDetail: true });
    } else {
      goHome();
    }
  }, [begId, goHome]);

  const onThankYouDone = useCallback(() => {
    setThankYouSheet(null);
    viewRequest();
  }, [viewRequest]);

  return (
    <Screen backgroundColor="#FFFFFF" centerVertical>
      <DonationThankYouModal
        visible={thankYouSheet != null}
        amount={thankYouSheet?.amount ?? 0}
        recipientName={thankYouSheet?.recipientName ?? ''}
        showRecipientName={thankYouSheet?.showRecipientName ?? true}
        onDone={onThankYouDone}
      />

      {(phase !== 'success' || !thankYouSheet) && (
      <View style={styles.card}>
        {phase === 'loading' ? (
          <>
            <ActivityIndicator size="large" color="#2E8BEA" />
            <Text style={styles.title}>Processing</Text>
            <Text style={styles.body}>{message}</Text>
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
      )}
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
