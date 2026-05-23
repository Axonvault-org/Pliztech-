import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { CTAButton } from '@/components/CTAButton';
import { ConfirmWithdrawalSummary } from '@/components/withdraw/ConfirmWithdrawalSummary';
import { FundedWithdrawRequestCard } from '@/components/withdraw/FundedWithdrawRequestCard';
import { VerifiedAccountNameCard } from '@/components/withdraw/VerifiedAccountNameCard';
import { WithdrawFundsShieldNotice } from '@/components/withdraw/WithdrawFundsShieldNotice';
import { WithdrawProgressSteps } from '@/components/withdraw/WithdrawProgressSteps';
import {
  addWithdrawalBankAccount,
  getWithdrawalBankAccounts,
  getWithdrawalBanks,
  resolveWithdrawalBankAccount,
  type NigerianBank,
} from '@/lib/api/bank-accounts';
import { categoryEmojiForId } from '@/constants/categories';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  apiCategorySlugToUiCategoryId,
  getMyBegs,
  type BegFeedItem,
} from '@/lib/api/beg';
import {
  begFundingProgress,
  begRaisedAmount,
  isBegRequestPeriodEnded,
  isBegWithdrawable,
} from '@/lib/beg/withdrawable';
import { getBegDonations } from '@/lib/api/donations';
import { PlizApiError } from '@/lib/api/types';
import type { WithdrawalApiItem } from '@/lib/api/withdrawals';
import { getUserWithdrawals, requestWithdrawal } from '@/lib/api/withdrawals';
import { calculateWithdrawalFeesDisplay } from '@/lib/withdrawal-fees';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

const BLUE_BAR = '#2E8BEA';
const ORANGE_BAR = '#F59E0B';
const GREEN_BAR = '#059669';

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function latestWithdrawalForBeg(
  withdrawals: WithdrawalApiItem[],
  begId: string
): WithdrawalApiItem | undefined {
  const forBeg = withdrawals.filter((w) => w.beg.id === begId);
  forBeg.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return forBeg[0];
}

type WithdrawRow = {
  begId: string;
  amountNaira: number;
  emoji: string;
  title: string;
  donorSubtitle: string;
  statusLabel: string;
  amountLabel: string;
  barFillRatio: number;
  barColor: string;
  selectable: boolean;
};

function buildRows(
  withdrawableBegs: BegFeedItem[],
  withdrawals: WithdrawalApiItem[],
  donorCountByBeg: Map<string, number>
): WithdrawRow[] {
  return withdrawableBegs.map((beg) => {
    const uiCat = apiCategorySlugToUiCategoryId(beg.category.slug);
    const emoji = categoryEmojiForId(uiCat);
    const title = (beg.title ?? '').trim() || 'Your request';
    const donors = donorCountByBeg.get(beg.id) ?? 0;
    const donorSubtitle =
      donors === 0
        ? 'Community supported this request'
        : donors === 1
          ? '1 donor contributed'
          : `${donors} donors contributed`;

    const raised = begRaisedAmount(beg);
    const goal = Math.round(Number(beg.amountRequested) || 0);
    const barFillRatio = begFundingProgress(beg);
    const isFullyFunded = beg.status === 'funded' || (goal > 0 && raised >= goal);
    const periodEnded = isBegRequestPeriodEnded(beg);
    const defaultStatusLabel = isFullyFunded
      ? 'Fully funded'
      : periodEnded
        ? 'Expired · Withdrawable'
        : 'Withdrawable';
    const w = latestWithdrawalForBeg(withdrawals, beg.id);

    if (!w || w.status === 'failed') {
      return {
        begId: beg.id,
        amountNaira: raised,
        emoji,
        title,
        donorSubtitle,
        statusLabel: defaultStatusLabel,
        amountLabel:
          goal > 0 && raised < goal
            ? `${formatNaira(raised)} of ${formatNaira(goal)}`
            : formatNaira(raised),
        barFillRatio,
        barColor: BLUE_BAR,
        selectable: true,
      };
    }

    if (w.status === 'pending' || w.status === 'processing') {
      return {
        begId: beg.id,
        amountNaira: Math.round(w.amount_received),
        emoji,
        title,
        donorSubtitle,
        statusLabel: 'Withdrawal Processing',
        amountLabel: formatNaira(w.amount_received),
        barFillRatio,
        barColor: ORANGE_BAR,
        selectable: false,
      };
    }

    if (w.status === 'completed') {
      return {
        begId: beg.id,
        amountNaira: Math.round(w.amount_received),
        emoji,
        title,
        donorSubtitle,
        statusLabel: 'Withdrawal Successful',
        amountLabel: formatNaira(w.amount_received),
        barFillRatio: 1,
        barColor: GREEN_BAR,
        selectable: false,
      };
    }

    return {
      begId: beg.id,
      amountNaira: raised,
      emoji,
      title,
      donorSubtitle,
      statusLabel: defaultStatusLabel,
      amountLabel:
        goal > 0 && raised < goal
          ? `${formatNaira(raised)} of ${formatNaira(goal)}`
          : formatNaira(raised),
      barFillRatio,
      barColor: BLUE_BAR,
      selectable: true,
    };
  });
}

function withdrawFundsHref(params: Record<string, string>) {
  return {
    pathname: '/(tabs)/withdraw-funds' as const,
    params,
  };
}

function withdrawFundsStep1Href() {
  return '/(tabs)/withdraw-funds' as const;
}

export default function WithdrawFundsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    step?: string;
    begId?: string;
    amount?: string;
    bankAccountId?: string;
  }>();
  const step = Math.min(3, Math.max(1, parseInt(String(params.step ?? '1'), 10) || 1));
  const paramBegId = typeof params.begId === 'string' ? params.begId : '';
  const paramBankAccountId =
    typeof params.bankAccountId === 'string' ? params.bankAccountId.trim() : '';
  const amountNaira = Math.max(0, parseInt(String(params.amount ?? '0'), 10) || 0);

  const { signOut } = useCurrentUser();
  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBegId, setSelectedBegId] = useState<string | null>(null);

  /** Step 2 — bank form */
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<NigerianBank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [step2Submitting, setStep2Submitting] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  type Step3Summary = {
    emoji: string;
    title: string;
    donorSubtitle: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    withdrawalAmountNaira: number;
    companyFee: number;
    vatFee: number;
    amountToReceive: number;
  };
  const [step3Summary, setStep3Summary] = useState<Step3Summary | null>(null);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3LoadError, setStep3LoadError] = useState<string | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { background?: boolean; _retry?: boolean }) => {
      const bg = opts?.background ?? false;
      const retry = opts?._retry ?? false;
      if (!bg) setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setRows([]);
          setError('Sign in to withdraw funds.');
          return;
        }

        const [begsRes, wdRes] = await Promise.all([
          getMyBegs(token, { page: 1, limit: 100 }),
          getUserWithdrawals(token, { page: 1, limit: 100 }),
        ]);

        const withdrawable = begsRes.begs.filter((b) => isBegWithdrawable(b));

        const donorMap = new Map<string, number>();
        await Promise.all(
          withdrawable.map(async (b) => {
            try {
              const d = await getBegDonations(b.id, { page: 1, limit: 1 });
              donorMap.set(b.id, d.pagination.total);
            } catch {
              donorMap.set(b.id, 0);
            }
          })
        );

        setRows(buildRows(withdrawable, wdRes.withdrawals, donorMap));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retry) {
          const ok = await recoverFromUnauthorized(signOut);
          if (ok) {
            await load({ background: bg, _retry: true });
            return;
          }
          return;
        }
        setError(
          e instanceof PlizApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Could not load requests'
        );
        if (!bg) setRows([]);
      } finally {
        if (!bg) setLoading(false);
      }
    },
    [signOut]
  );

  const loadBanks = useCallback(async () => {
    setBanksLoading(true);
    setBanksError(null);
    try {
      const list = await getWithdrawalBanks();
      list.sort((a, b) => a.name.localeCompare(b.name));
      setBanks(list);
    } catch (e) {
      setBanksError(
        e instanceof PlizApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not load banks'
      );
    } finally {
      setBanksLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (step === 2) {
      void loadBanks();
    }
  }, [step, loadBanks]);

  /** Step 2 / 3 require selection context; step 3 needs a bank account id */
  useEffect(() => {
    if (step !== 2 && step !== 3) return;
    if (!paramBegId || amountNaira <= 0) {
      router.replace(withdrawFundsStep1Href());
      return;
    }
    if (step === 3 && !paramBankAccountId) {
      router.replace(
        withdrawFundsHref({
          step: '2',
          begId: paramBegId,
          amount: String(amountNaira),
        })
      );
    }
  }, [step, paramBegId, amountNaira, paramBankAccountId]);

  const loadStep3Summary = useCallback(
    async (opts?: { _retry?: boolean }) => {
      const retry = opts?._retry ?? false;
      if (!paramBegId || !paramBankAccountId) return;
      setStep3Loading(true);
      setStep3LoadError(null);
      setConfirmError(null);
      setStep3Summary(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setStep3LoadError('Sign in again to continue.');
          return;
        }
        const [accounts, begsRes, wdRes] = await Promise.all([
          getWithdrawalBankAccounts(token),
          getMyBegs(token, { page: 1, limit: 100 }),
          getUserWithdrawals(token, { page: 1, limit: 100 }),
        ]);
        const acc = accounts.find((a) => a.id === paramBankAccountId);
        const beg = begsRes.begs.find((b) => b.id === paramBegId);
        if (!acc) {
          setStep3LoadError('Bank account not found. Go back and add your bank details again.');
          return;
        }
        if (!beg) {
          setStep3LoadError('This request could not be loaded.');
          return;
        }
        if (!isBegWithdrawable(beg)) {
          setStep3LoadError('This request is no longer available for withdrawal.');
          return;
        }
        const w = latestWithdrawalForBeg(wdRes.withdrawals, paramBegId);
        if (w && w.status !== 'failed') {
          setStep3LoadError(
            'A withdrawal is already in progress or completed for this request.'
          );
          return;
        }
        let donorTotal = 0;
        try {
          const d = await getBegDonations(paramBegId, { page: 1, limit: 1 });
          donorTotal = d.pagination.total;
        } catch {
          /* ignore */
        }
        const uiCat = apiCategorySlugToUiCategoryId(beg.category.slug);
        const emoji = categoryEmojiForId(uiCat);
        const title = (beg.title ?? '').trim() || 'Your request';
        const donorSubtitle =
          donorTotal === 0
            ? 'Community supported this request'
            : donorTotal === 1
              ? '1 donor contributed'
              : `${donorTotal} donors contributed`;
        const raised = Math.round(Number(beg.amountRaised) || 0);
        const fees = calculateWithdrawalFeesDisplay(raised);
        setStep3Summary({
          emoji,
          title,
          donorSubtitle,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName.trim().toUpperCase(),
          withdrawalAmountNaira: fees.amountRaised,
          companyFee: fees.companyFee,
          vatFee: fees.vatFee,
          amountToReceive: fees.amountToReceive,
        });
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retry) {
          const ok = await recoverFromUnauthorized(signOut);
          if (ok) {
            await loadStep3Summary({ _retry: true });
            return;
          }
        }
        setStep3LoadError(
          e instanceof PlizApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Could not load confirmation details'
        );
      } finally {
        setStep3Loading(false);
      }
    },
    [paramBegId, paramBankAccountId, signOut]
  );

  useEffect(() => {
    if (step !== 3) {
      setStep3Summary(null);
      setStep3LoadError(null);
      setConfirmError(null);
      return;
    }
    if (!paramBegId || !paramBankAccountId) return;
    void loadStep3Summary();
  }, [step, paramBegId, paramBankAccountId, loadStep3Summary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ background: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.begId === selectedBegId),
    [rows, selectedBegId]
  );

  const handleSelectRow = (row: WithdrawRow) => {
    if (!row.selectable) return;
    setSelectedBegId(row.begId);
  };

  const handleContinueStep1 = () => {
    if (!selectedBegId || !selectedRow) return;
    router.replace(
      withdrawFundsHref({
        step: '2',
        begId: selectedRow.begId,
        amount: String(selectedRow.amountNaira),
      })
    );
  };

  const goBackFromStep2Or3 = () => {
    if (step === 3) {
      router.replace(
        withdrawFundsHref({
          step: '2',
          begId: paramBegId,
          amount: String(amountNaira),
        })
      );
      return;
    }
    if (step === 2) {
      router.replace(withdrawFundsStep1Href());
      return;
    }
    router.back();
  };

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, bankSearch]);

  const accountDigits = accountNumber.replace(/\D/g, '').slice(0, 10);

  /** Debounced Paystack resolve when bank + 10-digit account are set */
  useEffect(() => {
    if (step !== 2 || !selectedBank || accountDigits.length !== 10) {
      setResolvedAccountName(null);
      setResolveError(null);
      setResolveLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setResolveLoading(true);
      setResolveError(null);
      setResolvedAccountName(null);
      try {
        const token = await getAccessToken();
        if (cancelled) return;
        if (!token) {
          setResolveLoading(false);
          setResolveError('Sign in to verify your account.');
          return;
        }
        const r = await resolveWithdrawalBankAccount(token, {
          accountNumber: accountDigits,
          bankCode: selectedBank.code,
        });
        if (cancelled) return;
        setResolvedAccountName(r.accountName.trim());
      } catch (e) {
        if (cancelled) return;
        setResolveError(
          e instanceof PlizApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Could not verify account'
        );
      } finally {
        if (!cancelled) setResolveLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, selectedBank, accountDigits]);

  const step2CanContinue =
    selectedBank !== null &&
    accountDigits.length === 10 &&
    Boolean(resolvedAccountName?.trim()) &&
    !resolveLoading &&
    !step2Submitting;

  const handleStep2Continue = async (_retry = false) => {
    if (!step2CanContinue || !selectedBank) return;
    setStep2Error(null);
    setStep2Submitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStep2Error('Sign in again to continue.');
        return;
      }
      const digits = accountNumber.replace(/\D/g, '').slice(0, 10);
      const created = await addWithdrawalBankAccount(token, {
        accountNumber: digits,
        bankCode: selectedBank.code,
      });
      router.replace(
        withdrawFundsHref({
          step: '3',
          begId: paramBegId,
          amount: String(amountNaira),
          bankAccountId: created.id,
        })
      );
    } catch (e) {
      if (isUnauthorizedSessionError(e) && !_retry) {
        const ok = await recoverFromUnauthorized(signOut);
        if (ok) {
          await handleStep2Continue(true);
          return;
        }
      }
      setStep2Error(
        e instanceof PlizApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not add bank account'
      );
    } finally {
      setStep2Submitting(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!paramBankAccountId || !paramBegId || !step3Summary) return;
    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setConfirmError('Sign in again to continue.');
        return;
      }
      const result = await requestWithdrawal(token, {
        begId: paramBegId,
        bankAccountId: paramBankAccountId,
      });
      Alert.alert('Withdrawal', result.message, [
        {
          text: 'Share a story',
          onPress: () => {
            void load();
            router.replace('/(tabs)/share-story');
          },
        },
        {
          text: 'Done',
          onPress: () => {
            void load();
            router.replace(withdrawFundsStep1Href());
          },
        },
      ]);
    } catch (e) {
      setConfirmError(
        e instanceof PlizApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not submit withdrawal'
      );
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const selectBank = (b: NigerianBank) => {
    setSelectedBank(b);
    setBankPickerOpen(false);
    setBankSearch('');
    setResolvedAccountName(null);
    setResolveError(null);
  };

  return (
    <Screen backgroundColor={step === 3 ? '#F9FAFB' : '#FFFFFF'}>
      <View style={{ paddingTop: 8 }}>
        <AppHeaderTitleRow
          title="Withdraw Funds"
          onPressBack={goBackFromStep2Or3}
          marginBottom={8}
        />
      </View>

      <View style={styles.body}>
        <WithdrawProgressSteps currentStep={step} totalSteps={3} />

        {step === 1 ? (
          <>
            <Text style={styles.screenTitle}>Select a request</Text>
            <Text style={styles.screenSubtitle}>
              Withdraw donations from fully funded requests or from expired requests with partial
              funding
            </Text>

            {loading && rows.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2E8BEA" />
                <Text style={styles.loadingHint}>Loading withdrawable requests…</Text>
              </View>
            ) : null}

            {error && !loading ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => void load()} style={styles.retryWrap}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <FlatList
              style={styles.list}
              data={rows}
              keyExtractor={(item) => item.begId}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                !loading && !error ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>🏦</Text>
                    <Text style={styles.emptyTitle}>Nothing to withdraw yet</Text>
                    <Text style={styles.emptySub}>
                      When a request is fully funded or expires with donations, it will appear here
                      so you can withdraw to your bank account.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <FundedWithdrawRequestCard
                  emoji={item.emoji}
                  title={item.title}
                  donorSubtitle={item.donorSubtitle}
                  statusLabel={item.statusLabel}
                  amountLabel={item.amountLabel}
                  barFillRatio={item.barFillRatio}
                  barColor={item.barColor}
                  selected={selectedBegId === item.begId}
                  disabled={!item.selectable}
                  onPress={item.selectable ? () => handleSelectRow(item) : undefined}
                />
              )}
            />

            {rows.some((r) => r.selectable) ? (
              <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.ctaWrap}>
                  <CTAButton
                    label="Continue"
                    onPress={handleContinueStep1}
                    variant="gradient"
                    disabled={!selectedBegId}
                    accessibilityLabel="Continue to bank details"
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <KeyboardAvoidingView
            style={styles.step2Flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <ScrollView
              style={styles.step2Flex}
              contentContainerStyle={styles.step2ScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.screenTitle}>Enter Bank Details</Text>
              <Text style={styles.screenSubtitle}>
                Where should we send {formatNaira(amountNaira)}?
              </Text>

              <Text style={styles.fieldLabel}>Bank</Text>
              <Pressable
                onPress={() => setBankPickerOpen(true)}
                style={styles.inputShell}
                accessibilityRole="button"
                accessibilityLabel="Select bank"
              >
                <Text
                  style={[styles.inputLikeText, !selectedBank && styles.placeholderText]}
                  numberOfLines={1}
                >
                  {selectedBank ? selectedBank.name : 'Select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={22} color="#9CA3AF" />
              </Pressable>

              <Text style={styles.fieldLabel}>Account Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 10-digit account number"
                placeholderTextColor="#9CA3AF"
                value={accountDigits}
                onChangeText={(t) => setAccountNumber(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                maxLength={10}
                autoCorrect={false}
              />

              {resolveLoading ? (
                <View style={styles.resolveLoadingRow}>
                  <ActivityIndicator size="small" color="#2E8BEA" />
                  <Text style={styles.resolveLoadingText}>Verifying account…</Text>
                </View>
              ) : null}

              {resolveError &&
              accountDigits.length === 10 &&
              selectedBank &&
              !resolveLoading ? (
                <Text style={styles.resolveErrorText}>{resolveError}</Text>
              ) : null}

              {resolvedAccountName ? (
                <VerifiedAccountNameCard accountName={resolvedAccountName} />
              ) : null}

              {banksError ? (
                <View style={styles.inlineWarn}>
                  <Text style={styles.inlineWarnText}>{banksError}</Text>
                  <Pressable onPress={() => void loadBanks()}>
                    <Text style={styles.retryText}>Retry banks</Text>
                  </Pressable>
                </View>
              ) : null}

              {step2Error ? (
                <Text style={styles.step2ErrorText}>{step2Error}</Text>
              ) : null}
            </ScrollView>

            <View style={[styles.step2Footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.ctaWrap}>
                <CTAButton
                  label={step2Submitting ? 'Saving…' : 'Continue'}
                  onPress={() => void handleStep2Continue(false)}
                  variant="gradient"
                  disabled={!step2CanContinue || step2Submitting}
                  accessibilityLabel="Continue to confirmation"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : null}

        {step === 3 ? (
          <View style={styles.step3Wrap}>
            <ScrollView
              style={styles.step3Scroll}
              contentContainerStyle={styles.step3ScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.screenTitle}>Confirm Withdrawal</Text>
              <Text style={styles.screenSubtitle}>Review the details before proceeding</Text>

              {step3Loading ? (
                <View style={styles.step3LoadingBox}>
                  <ActivityIndicator size="large" color="#2E8BEA" />
                  <Text style={styles.step3LoadingText}>Loading summary…</Text>
                </View>
              ) : null}

              {step3LoadError && !step3Loading ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{step3LoadError}</Text>
                  <Pressable onPress={() => void loadStep3Summary()} style={styles.retryWrap}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      router.replace(
                        withdrawFundsHref({
                          step: '2',
                          begId: paramBegId,
                          amount: String(amountNaira),
                        })
                      )
                    }
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnLabel}>Back to bank details</Text>
                  </Pressable>
                </View>
              ) : null}

              {step3Summary && !step3Loading ? (
                <>
                  <ConfirmWithdrawalSummary
                    emoji={step3Summary.emoji}
                    title={step3Summary.title}
                    donorSubtitle={step3Summary.donorSubtitle}
                    bankName={step3Summary.bankName}
                    accountNumber={step3Summary.accountNumber}
                    accountName={step3Summary.accountName}
                    withdrawalAmountNaira={step3Summary.withdrawalAmountNaira}
                    companyFee={step3Summary.companyFee}
                    vatFee={step3Summary.vatFee}
                    amountToReceive={step3Summary.amountToReceive}
                  />
                  <WithdrawFundsShieldNotice />
                  {confirmError ? (
                    <Text style={styles.step3ConfirmError}>{confirmError}</Text>
                  ) : null}
                </>
              ) : null}
            </ScrollView>

            {step3Summary && !step3Loading && !step3LoadError ? (
              <View style={[styles.step3Footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.ctaWrap}>
                  <CTAButton
                    label={confirmSubmitting ? 'Submitting…' : 'Continue'}
                    onPress={() => void handleConfirmWithdrawal()}
                    variant="gradient"
                    disabled={confirmSubmitting}
                    accessibilityLabel="Confirm and submit withdrawal"
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal
        visible={bankPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBankPickerOpen(false)}
      >
        <View style={[styles.pickerHeader, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.pickerTitle}>Select bank</Text>
          <Pressable
            onPress={() => {
              setBankPickerOpen(false);
              setBankSearch('');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.pickerDone}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.pickerSearchWrap}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.pickerSearchIcon} />
          <TextInput
            style={styles.pickerSearchInput}
            placeholder="Search banks"
            placeholderTextColor="#9CA3AF"
            value={bankSearch}
            onChangeText={setBankSearch}
            autoCorrect={false}
          />
        </View>
        {banksLoading ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator size="large" color="#2E8BEA" />
          </View>
        ) : (
          <FlatList
            data={filteredBanks}
            keyExtractor={(item) => item.code + item.slug}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                onPress={() => selectBank(item)}
              >
                <Text style={styles.pickerRowText}>{item.name}</Text>
                {selectedBank?.code === item.code ? (
                  <Ionicons name="checkmark-circle" size={22} color="#2E8BEA" />
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.pickerEmpty}>No banks match your search.</Text>
            }
          />
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 20,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  retryWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 12,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  pressed: {
    opacity: 0.9,
  },
  step2Flex: {
    flex: 1,
  },
  step2ScrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  inputLikeText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  textInput: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  inlineWarn: {
    marginBottom: 12,
  },
  inlineWarnText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 6,
  },
  step2ErrorText: {
    fontSize: 14,
    color: '#B91C1C',
    marginTop: 8,
  },
  resolveLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  resolveLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resolveErrorText: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 12,
    lineHeight: 20,
  },
  step2Footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  step3Wrap: {
    flex: 1,
  },
  step3Scroll: {
    flex: 1,
  },
  step3ScrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  step3LoadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  step3LoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  step3Footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  step3ConfirmError: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 8,
    lineHeight: 20,
  },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minHeight: 44,
  },
  pickerSearchIcon: {
    marginRight: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 10,
  },
  pickerList: {
    paddingBottom: 32,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  pickerRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  pickerRowText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingRight: 12,
  },
  pickerEmpty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
    fontSize: 15,
  },
  pickerLoading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});
