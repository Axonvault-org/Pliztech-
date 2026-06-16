import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getCommunityPulseFeed,
  getCommunityPulseWebRedirectUrl,
  initializeCommunityPulseDonation,
  verifyCommunityPulseDonation,
  type CommunityPulseFeed,
} from '@/lib/api/community-pulse';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessTokenOrTryRefresh } from '@/lib/auth/session-expired';
import {
  getPaymentNativeCallbackUrl,
  referenceFromPaymentRedirectUrl,
  transactionIdFromPaymentRedirectUrl,
} from '@/lib/donation/payment-callback-url';
import { digitsOnly, formatAmountInput } from '@/lib/money/input-format';

function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

function firstQuery(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

export default function CommunityPulseScreen() {
  const { user } = useCurrentUser();
  const params = useLocalSearchParams<{
    tx_ref?: string;
    reference?: string;
    trxref?: string;
    transaction_id?: string;
  }>();
  const [feed, setFeed] = useState<CommunityPulseFeed | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('10,000');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const txRefFromUrl = useMemo(() => {
    return firstQuery(params.tx_ref) || firstQuery(params.reference) || firstQuery(params.trxref);
  }, [params.tx_ref, params.reference, params.trxref]);
  const transactionIdFromUrl = useMemo(
    () => firstQuery(params.transaction_id),
    [params.transaction_id]
  );

  const numericAmount = useMemo(() => {
    const parsed = parseInt(digitsOnly(amount), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const loadFeed = useCallback(async () => {
    try {
      const data = await getCommunityPulseFeed({ page: 1, limit: 10 });
      setFeed(data);
    } catch (e) {
      Alert.alert('Community Purse', formatPlizApiErrorForUser(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!txRefFromUrl) return;
    let cancelled = false;
    void (async () => {
      setVerifyMessage('Confirming your Community Purse donation...');
      try {
        const result = await verifyCommunityPulseDonation({
          txRef: txRefFromUrl,
          transactionId: transactionIdFromUrl || undefined,
        });
        if (cancelled) return;
        setVerifyMessage(`Thank you. Your ${formatNaira(result.amount)} support was recorded.`);
        await loadFeed();
      } catch (e) {
        if (cancelled) return;
        setVerifyMessage(formatPlizApiErrorForUser(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [txRefFromUrl, transactionIdFromUrl, loadFeed]);

  async function startDonation() {
    if (busy) return;
    if (numericAmount < 100) {
      Alert.alert('Amount', 'Minimum Community Purse support is ₦100.');
      return;
    }

    setBusy(true);
    try {
      const token = await getAccessTokenOrTryRefresh();
      const redirectUrl =
        Platform.OS === 'web' ? getCommunityPulseWebRedirectUrl() : getPaymentNativeCallbackUrl();
      const result = await initializeCommunityPulseDonation(token, {
        amount: numericAmount,
        donorName: user?.profile?.displayName ?? user?.username,
        donorEmail: user?.email ?? 'community@plz.app',
        isAnonymous,
        message: message.trim() || undefined,
        redirectUrl,
      });

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.assign(result.payment_url);
        return;
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(result.payment_url, redirectUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showInRecents: false,
      });

      if (browserResult.type !== 'success' || !('url' in browserResult)) {
        setVerifyMessage('Payment was closed before confirmation.');
        return;
      }

      const returnedRef = referenceFromPaymentRedirectUrl(browserResult.url) ?? result.tx_ref;
      const returnedTransactionId =
        transactionIdFromPaymentRedirectUrl(browserResult.url) ?? undefined;
      const verified = await verifyCommunityPulseDonation({
        txRef: returnedRef,
        transactionId: returnedTransactionId,
      });
      setVerifyMessage(`Thank you. Your ${formatNaira(verified.amount)} support was recorded.`);
      setMessage('');
      await loadFeed();
    } catch (e) {
      Alert.alert('Could not start donation', formatPlizApiErrorForUser(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen backgroundColor="#FFFFFF">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadFeed();
            }}
            tintColor="#2E8BEA"
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>Community Purse</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.infoPanel}>
          <Ionicons name="information-circle-outline" size={22} color="#2E8BEA" />
          <Text style={styles.infoText}>
            The Community Purse is a shared pool funded by generous individuals and
            organizations. Funds from the purse are used to support requests across the Plz
            community, helping ensure that more people receive timely support when they need it
            most.
          </Text>
        </View>

        {verifyMessage ? (
          <View style={styles.notice}>
            <Ionicons name="heart-circle-outline" size={22} color="#2E8BEA" />
            <Text style={styles.noticeText}>{verifyMessage}</Text>
          </View>
        ) : null}

        <View style={styles.donatePanel}>
          <Text style={styles.sectionTitle}>Support Many People</Text>
          <View style={styles.amountRow}>
            {QUICK_AMOUNTS.map((n) => (
              <Pressable
                key={n}
                style={[styles.amountChip, numericAmount === n && styles.amountChipSelected]}
                onPress={() => setAmount(n.toLocaleString('en-NG'))}
              >
                <Text style={[styles.amountChipText, numericAmount === n && styles.amountChipTextSelected]}>
                  {formatNaira(n)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inputShell}>
            <Text style={styles.inputPrefix}>₦</Text>
            <TextInput
              value={amount}
              onChangeText={(text) => setAmount(formatAmountInput(text))}
              keyboardType="number-pad"
              placeholder="Amount"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Optional message"
            placeholderTextColor="#9CA3AF"
            style={[styles.inputShell, styles.messageInput]}
            maxLength={500}
            multiline
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Donate anonymously</Text>
              <Text style={styles.toggleSubtitle}>Hide your name from the community feed.</Text>
            </View>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
          </View>
          <CTAButton
            label={busy ? 'Opening payment...' : 'Donate to Community Purse'}
            onPress={() => void startDonation()}
            disabled={busy}
            leftIcon="heart-outline"
          />
        </View>

        <Text style={styles.sectionTitle}>Recent supporters</Text>
        {(feed?.donations ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No Community Purse donations yet.</Text>
        ) : (
          feed!.donations.map((d) => (
            <View key={d.id} style={styles.donationRow}>
              <View>
                <Text style={styles.donorName}>{d.donor_name}</Text>
                {d.message ? <Text style={styles.donorMessage}>{d.message}</Text> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 36,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
  },
  donatePanel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountChipSelected: {
    borderColor: '#2E8BEA',
    backgroundColor: '#EFF6FF',
  },
  amountChipText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  amountChipTextSelected: {
    color: '#2E8BEA',
  },
  inputShell: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    color: '#111827',
  },
  inputPrefix: {
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  messageInput: {
    minHeight: 86,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 14,
  },
  toggleTitle: {
    fontWeight: '700',
    color: '#1F2937',
  },
  toggleSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 18,
  },
  donationRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  donorName: {
    fontWeight: '700',
    color: '#1F2937',
  },
  donorMessage: {
    marginTop: 3,
    color: '#6B7280',
    maxWidth: 280,
  },
});
