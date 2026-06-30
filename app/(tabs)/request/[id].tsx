import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';

import { DonationThankYouModal } from '@/components/donation/DonationThankYouModal';
import { BegEvidenceViewerModal } from '@/components/evidence/BegEvidenceViewerModal';
import { CTAButton } from '@/components/CTAButton';
import { Text } from '@/components/Text';

import { ProgressBar } from '@/components/ProgressBar';
import { AmountChip } from '@/components/request/AmountChip';
import { RequestDetailHeader } from '@/components/request/RequestDetailHeader';
import { RequestDonorList } from '@/components/request/RequestDonorList';
import { RequesterAvatar } from '@/components/request/RequesterAvatar';
import { MemberProfileModal } from '@/components/profile/MemberProfileModal';
import { ReportContentSheet, type ReportTarget } from '@/components/safety/ReportContentSheet';
import { VerifiedByPlzBadge } from '@/components/safety/VerifiedByPlzBadge';
import { VerificationStatusDot } from '@/components/safety/VerificationStatusDot';
import { Screen } from '@/components/Screen';
import { REQUEST_CATEGORIES } from '@/constants/categories';
import {
    begFeedItemToRequestDetail,
    getBegById,
    hideBeg,
} from '@/lib/api/beg';
import { blockUser } from '@/lib/api/blocks';
import { initializeDonation, getBegDonations, type BegDonationApiItem } from '@/lib/api/donations';
import {
  deleteBegEvidence,
  getBegEvidence,
  uploadBegEvidence,
  updateEvidenceSensitivity,
  type BegEvidenceItem,
  type EvidenceUploadFile,
} from '@/lib/api/evidence';
import { reportBeg } from '@/lib/api/reports';
import { getReactions, toggleReaction, type ReactionsPayload } from '@/lib/api/reactions';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getPaymentDonationCallbackUrl, getPaymentWebCallbackUrl } from '@/lib/donation/payment-callback-url';
import { savePendingDonationThankYou } from '@/lib/donation/pending-thank-you';
import { savePendingPaymentCheckout } from '@/lib/donation/pending-payment-checkout';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import * as ImagePicker from 'expo-image-picker';
import { openPaymentCheckout } from '@/lib/utils/open-payment-checkout';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import { getAccessToken } from '@/lib/auth/access-token';
import { digitsOnly, formatAmountInput } from '@/lib/money/input-format';
import {
  isBegActiveForWithdrawNow,
  isBegWithdrawable,
} from '@/lib/beg/withdrawable';
import {
  getUserWithdrawals,
  latestWithdrawalForBeg,
  type WithdrawalApiItem,
} from '@/lib/api/withdrawals';
import type { RequestDetail } from '@/lib/types/requests';
import {
  getPlatformFee,
  getRequestReceives,
  getVatOnPlatformFee,
  PLATFORM_FEE_PERCENT,
  VAT_ON_PLATFORM_FEE_PERCENT,
} from '@/lib/types/requests';

const AMOUNT_OPTIONS = [
  { value: 1000, label: '₦1K' },
  { value: 2000, label: '₦2K' },
  { value: 5000, label: '₦5K' },
  { value: 10000, label: '₦10K' },
];

const MIN_DONATION_AMOUNT = 100;
const MAX_DONATION_AMOUNT = 100000;

/** Figma-style emoji reaction pills (counts from API when available). */
const REACTION_PILLS: {
  emoji: string;
  field: 'thumbsUp' | 'hearts' | 'gifts' | 'crowns' | 'messages';
}[] = [
  { emoji: '👍', field: 'thumbsUp' },
  { emoji: '❤️', field: 'hearts' },
  { emoji: '😂', field: 'gifts' },
  { emoji: '🥳', field: 'crowns' },
  { emoji: '😢', field: 'messages' },
];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

/** Largest preset ≤ amount needed, or exact remainder in custom when below smallest chip. */
function defaultDonationSelection(amountNeeded: number): {
  selected: number | null;
  custom: string;
} {
  if (amountNeeded < MIN_DONATION_AMOUNT) {
    return { selected: null, custom: '' };
  }

  const fittingPreset = [...AMOUNT_OPTIONS]
    .map((o) => o.value)
    .filter((v) => v <= amountNeeded)
    .sort((a, b) => b - a)[0];

  if (fittingPreset != null) {
    return { selected: fittingPreset, custom: '' };
  }

  return { selected: null, custom: String(amountNeeded) };
}

/** Wide readable column on tablet / web; full width on phones. */
const REQUEST_DETAIL_MAX_WIDTH = 960;

export default function RequestDetailScreen() {
  const { user, signOut } = useCurrentUser();
  const anonymousModeEnabled = user?.profile?.isAnonymous ?? false;
  const params = useLocalSearchParams<{ id: string; donate?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const donateIntent = params.donate === '1' || params.donate === 'true';

  const scrollRef = useRef<ScrollView>(null);
  const pageContentRef = useRef<View>(null);
  const donationAnchorRef = useRef<View>(null);
  const pendingDonateScroll = useRef(false);

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionsPayload | null>(null);
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [begDonations, setBegDonations] = useState<BegDonationApiItem[]>([]);
  const [donorTotal, setDonorTotal] = useState(0);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [ownerWithdrawal, setOwnerWithdrawal] = useState<WithdrawalApiItem | null>(null);
  const [evidence, setEvidence] = useState<BegEvidenceItem[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceViewerOpen, setEvidenceViewerOpen] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const loadRequest = useCallback(async () => {
    if (!id) {
      setRequest(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const beg = await getBegById(id, token);
      setRequest(begFeedItemToRequestDetail(beg));
    } catch (e) {
      setRequest(null);
      setError(formatPlizApiErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const scrollToDonationSection = useCallback(() => {
    const pageNode = pageContentRef.current;
    const anchorNode = donationAnchorRef.current;
    if (!pageNode || !anchorNode) return;
    anchorNode.measureLayout(
      pageNode,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (
      donateIntent &&
      !loading &&
      request &&
      user?.id !== request.ownerUserId &&
      request.canDonate !== false
    ) {
      pendingDonateScroll.current = true;
    }
  }, [donateIntent, loading, request, user?.id]);

  const loadReactions = useCallback(async () => {
    if (!id) return;
    try {
      const data = await withUnauthorizedRecovery(signOut, (token) =>
        getReactions(token, 'beg', id)
      );
      setReactions(data);
    } catch {
      setReactions(null);
    }
  }, [id, signOut]);

  useEffect(() => {
    void loadReactions();
  }, [loadReactions]);

  const loadDonors = useCallback(async () => {
    if (!id) return;
    setDonorsLoading(true);
    try {
      const result = await getBegDonations(id, { page: 1, limit: 50 });
      setBegDonations(result.donations);
      setDonorTotal(result.pagination.total);
    } catch {
      setBegDonations([]);
      setDonorTotal(0);
    } finally {
      setDonorsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!request?.ownerUserId || !user?.id || user.id !== request.ownerUserId) {
      setBegDonations([]);
      setDonorTotal(0);
      setOwnerWithdrawal(null);
      return;
    }
    void loadDonors();
  }, [request?.ownerUserId, user?.id, loadDonors]);

  const loadOwnerWithdrawal = useCallback(async () => {
    if (!id || !request?.ownerUserId || !user?.id || user.id !== request.ownerUserId) {
      setOwnerWithdrawal(null);
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        setOwnerWithdrawal(null);
        return;
      }
      const wd = await getUserWithdrawals(token, { page: 1, limit: 50 });
      setOwnerWithdrawal(latestWithdrawalForBeg(wd.withdrawals, id) ?? null);
    } catch {
      setOwnerWithdrawal(null);
    }
  }, [id, request?.ownerUserId, user?.id]);

  useEffect(() => {
    void loadOwnerWithdrawal();
  }, [loadOwnerWithdrawal, request?.raised, request?.isWithdrawn]);

  const loadEvidence = useCallback(async () => {
    if (!id || !request?.ownerUserId) {
      setEvidence([]);
      return;
    }
    setEvidenceLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setEvidence([]);
        return;
      }
      setEvidence(await getBegEvidence(token, id));
    } catch {
      setEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  }, [id, request?.ownerUserId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const onAddEvidence = useCallback(async () => {
    if (!id || evidenceUploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const file: EvidenceUploadFile = {
      uri: asset.uri,
      name: asset.fileName || `beg-evidence-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      file: asset.file,
    };
    setEvidenceUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in again.');
      await uploadBegEvidence(token, id, file);
      await loadEvidence();
    } catch (e) {
      Alert.alert('Could not upload evidence', formatPlizApiErrorForUser(e));
    } finally {
      setEvidenceUploading(false);
    }
  }, [id, evidenceUploading, loadEvidence]);

  const openReportBeg = useCallback(() => {
    if (!id || !request) return;
    setReportTarget({ type: 'beg', id, label: request.text });
    setReportVisible(true);
  }, [id, request]);

  const onToggleEvidenceSensitivity = useCallback(
    (item: BegEvidenceItem, next: boolean) => {
      if (!id) return;
      void (async () => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Please sign in again.');
          await updateEvidenceSensitivity(token, id, item.id, next);
          await loadEvidence();
        } catch (e) {
          Alert.alert('Could not update sensitivity', formatPlizApiErrorForUser(e));
        }
      })();
    },
    [id, loadEvidence]
  );

  const onDeleteEvidence = useCallback(
    (item: BegEvidenceItem) => {
      if (!id) return;
      Alert.alert('Delete evidence?', 'This removes the file from your request.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                const token = await getAccessToken();
                if (!token) throw new Error('Please sign in again.');
                await deleteBegEvidence(token, id, item.id);
                await loadEvidence();
              } catch (e) {
                Alert.alert('Could not delete evidence', formatPlizApiErrorForUser(e));
              }
            })(),
        },
      ]);
    },
    [id, loadEvidence]
  );

  /** Set when request loads or user changes amount — avoids errors on first paint. */
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customAmountFocused, setCustomAmountFocused] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [showName, setShowName] = useState(true);
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationProgressMessage, setDonationProgressMessage] = useState('');
  const [donationThankYou, setDonationThankYou] = useState<{
    amount: number;
    recipientName: string;
    showRecipientName: boolean;
    donationId?: string;
  } | null>(null);
  const customAmountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (anonymousModeEnabled) {
      setShowName(false);
    }
  }, [anonymousModeEnabled]);

  const amountNeeded = request ? Math.max(0, request.goal - request.raised) : 0;

  const requestId = request?.id;

  useEffect(() => {
    if (!requestId) return;
    const { selected, custom } = defaultDonationSelection(amountNeeded);
    setSelectedAmount(selected);
    setCustomAmount(custom);
    setAmountTouched(false);
  }, [requestId, amountNeeded]);

  const parsedCustomAmount = useMemo(() => {
    const parsed = parseInt(digitsOnly(customAmount), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [customAmount]);
  const customAmountDisplay = customAmountFocused
    ? customAmount
    : formatAmountInput(customAmount);
  const selectedDonationAmount = selectedAmount ?? parsedCustomAmount;
  const donationAmountError = useMemo(() => {
    if (selectedDonationAmount <= 0) return null;
    if (selectedDonationAmount < MIN_DONATION_AMOUNT) {
      return `Minimum donation is ${formatNaira(MIN_DONATION_AMOUNT)}.`;
    }
    if (selectedDonationAmount > MAX_DONATION_AMOUNT) {
      return `Maximum donation is ${formatNaira(MAX_DONATION_AMOUNT)}.`;
    }
    if (amountNeeded > 0 && selectedDonationAmount > amountNeeded) {
      return `This request only needs ${formatNaira(amountNeeded)} more.`;
    }
    return null;
  }, [amountNeeded, selectedDonationAmount]);

  const visibleDonationError = amountTouched ? donationAmountError : null;

  const onContinueDonation = useCallback(async () => {
    if (donationSubmitting) return;
    setAmountTouched(true);
    if (!id?.trim()) {
      Alert.alert('Request', 'Missing request id. Go back and open the request again.');
      return;
    }

    const rawAmount = selectedDonationAmount;

    if (!Number.isFinite(rawAmount) || rawAmount < 100) {
      Alert.alert('Amount', 'Select a preset amount or enter at least ₦100.');
      return;
    }
    if (donationAmountError) {
      return;
    }

    setDonationSubmitting(true);
    setDonationProgressMessage('Opening secure payment...');
    const effectiveShowName = anonymousModeEnabled ? false : showName;
    try {
      const callbackUrl =
        Platform.OS === 'web'
          ? getPaymentWebCallbackUrl()
          : getPaymentDonationCallbackUrl();
      const result = await withUnauthorizedRecovery(signOut, (token) =>
        initializeDonation(token, {
          begId: id,
          amount: rawAmount,
          paymentMethod: 'card',
          isAnonymous: !effectiveShowName,
          callbackUrl,
        })
      );

      if (result.kind === 'checkout') {
        if (request) {
          try {
            await savePendingDonationThankYou({
              amount: rawAmount,
              recipientName: request.name,
              begId: id,
              donationId: result.donationId,
              paymentReference: result.paymentReference,
              showRecipientName: effectiveShowName,
            });
          } catch {
            /* still open checkout — storage must not block payment */
          }
        }

        if (Platform.OS === 'web') {
          await openPaymentCheckout(result.paymentUrl, {
            redirectUrl: callbackUrl,
            paymentReference: result.paymentReference,
          });
          return;
        }

        // Native: one completion surface — callback opens checkout, verifies, and shows thank-you.
        await savePendingPaymentCheckout({
          reference: result.paymentReference,
          paymentUrl: result.paymentUrl,
          redirectUrl: callbackUrl,
        });
        router.replace({
          pathname: '/payment/callback',
          params: {
            reference: result.paymentReference,
            checkout: '1',
          },
        });
        return;
      } else {
        if (request) {
          setDonationThankYou({
            amount: rawAmount,
            recipientName: request.name,
            showRecipientName: effectiveShowName,
            donationId: result.donationId,
          });
        } else {
          Alert.alert(
            'Payment started',
            'Your donation is processing. You will see updates when it completes.',
            [{ text: 'OK', onPress: () => void loadRequest() }]
          );
        }
        void loadRequest();
      }
    } catch (e) {
      Alert.alert('Could not start donation', formatPlizApiErrorForUser(e));
    } finally {
      setDonationSubmitting(false);
      setDonationProgressMessage('');
    }
  }, [
    id,
    donationSubmitting,
    selectedDonationAmount,
    donationAmountError,
    showName,
    anonymousModeEnabled,
    request,
    loadRequest,
    loadDonors,
    signOut,
  ]);

  const categoryIcon = useMemo(() => {
    if (!request) return 'briefcase-outline' as keyof typeof Ionicons.glyphMap;
    const cat = REQUEST_CATEGORIES.find((c) => c.id === request.categoryId);
    return (cat?.icon ?? 'briefcase-outline') as keyof typeof Ionicons.glyphMap;
  }, [request]);

  const ownerUserIdForSafety = request?.ownerUserId;
  const isOwnerForSafety = Boolean(
    user?.id && ownerUserIdForSafety && user.id === ownerUserIdForSafety
  );

  const onSafetyMenu = useCallback(() => {
    if (!id || !ownerUserIdForSafety || isOwnerForSafety) return;
    Alert.alert('Request options', undefined, [
      {
        text: 'Hide from feed',
        onPress: () =>
          void (async () => {
            try {
              await withUnauthorizedRecovery(signOut, (token) => hideBeg(token, id));
              Alert.alert('Hidden', 'This request will no longer appear in your feed.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('Could not hide request', formatPlizApiErrorForUser(e));
            }
          })(),
      },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            try {
              await withUnauthorizedRecovery(signOut, (token) =>
                blockUser(token, ownerUserIdForSafety)
              );
              Alert.alert('User blocked', 'You will no longer see content from this user.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('Could not block user', formatPlizApiErrorForUser(e));
            }
          })(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [id, ownerUserIdForSafety, isOwnerForSafety, signOut]);

  if (!id) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <View style={styles.pageContent}>
          <RequestDetailHeader />
          <View style={styles.centered}>
            <Text style={styles.errorText}>Request not found</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (loading && !request) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <View style={styles.pageContent}>
          <RequestDetailHeader />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2E8BEA" />
            <Text style={styles.loadingHint}>Loading request…</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (error && !request) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <View style={styles.pageContent}>
          <RequestDetailHeader />
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void loadRequest()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading request"
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <View style={styles.pageContent}>
          <RequestDetailHeader />
          <View style={styles.centered}>
            <Text style={styles.errorText}>Request not found</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const {
    name,
    initial,
    avatarColor,
    avatarUrl,
    categoryLabel,
    badge,
    fullDescription,
    timeAgo,
    timeRemaining,
    raised,
    goal,
    percent,
    thumbsUp,
    hearts,
    gifts,
    crowns,
    messages,
    ownerUserId,
    isAnonymous,
    approved,
    ownerKycVerified,
    canDonate: canDonateFromApi,
    viewerDonation,
    begStatus,
    isWithdrawn,
  } = request;

  const isOwner =
    Boolean(user?.id && ownerUserId && user.id === ownerUserId);
  const canViewEvidence = Boolean(ownerUserId);

  const isAwaitingApproval = isOwner && approved === false;
  const isVerifiedRequest = Boolean(approved && !isAwaitingApproval);
  const isOwnerKycVerified = Boolean(ownerKycVerified);
  const ownerWithdrawalPending =
    ownerWithdrawal != null &&
    (ownerWithdrawal.status === 'pending' || ownerWithdrawal.status === 'processing');
  const ownerWithdrawalCompleted = ownerWithdrawal?.status === 'completed';
  const ownerCanWithdraw =
    isOwner &&
    !isAwaitingApproval &&
    isBegWithdrawable({
      status: begStatus ?? 'active',
      expiresAt: request.expiresAt ?? '',
      amountRaised: raised,
      amountRequested: goal,
      isWithdrawn,
      approved: approved === true,
    }) &&
    !ownerWithdrawalPending &&
    !ownerWithdrawalCompleted &&
    !isWithdrawn;
  const ownerShowWithdrawCta =
    isOwner &&
    !isAwaitingApproval &&
    !ownerWithdrawalPending &&
    !ownerWithdrawalCompleted &&
    !isWithdrawn &&
    !['cancelled', 'rejected', 'flagged', 'withdrawn'].includes(begStatus ?? '');
  const ownerWithdrawEnabled = ownerCanWithdraw;
  const withdrawNowActive =
    ownerWithdrawEnabled &&
    isBegActiveForWithdrawNow({
      status: begStatus ?? 'active',
      expiresAt: request.expiresAt ?? '',
      amountRaised: raised,
      amountRequested: goal,
    });

  const onOwnerWithdrawPress = () => {
    router.push({
      pathname: '/(tabs)/withdraw-funds',
      params: {
        step: '2',
        begId: request.id,
        amount: String(raised),
      },
    });
  };
  const canViewRequesterProfile =
    Boolean(ownerUserId) && !isAnonymous && !isOwner;

  const onViewRequesterProfile = () => {
    if (!ownerUserId || isAnonymous) return;
    if (isOwner) {
      router.push('/(tabs)/(main)/profile' as Href);
      return;
    }
    setProfileModalUserId(ownerUserId);
  };
  const visitorCanDonate =
    canDonateFromApi ??
    (approved !== false &&
      timeRemaining !== 'Expired' &&
      timeRemaining !== 'Pending approval');

  const platformFee = getPlatformFee(goal);
  const vatOnPlatformFee = getVatOnPlatformFee(goal);
  const requesterReceives = getRequestReceives(goal);

  const reactionCounts: Record<string, number> = {
    thumbsUp,
    hearts,
    gifts,
    crowns,
    messages,
  };

  const apiReactionCounts = new Map(
    (reactions?.reactions ?? []).map((reaction) => [reaction.emoji, reaction.count])
  );

  const onToggleReaction = async (emoji: string) => {
    if (!id || reactionBusy) return;
    setReactionBusy(emoji);
    try {
      const data = await withUnauthorizedRecovery(signOut, (token) =>
        toggleReaction(token, 'beg', id, emoji)
      );
      setReactions(data);
    } catch (e) {
      Alert.alert('Could not react', formatPlizApiErrorForUser(e));
    } finally {
      setReactionBusy(null);
    }
  };

  /** Figma: clock badge shows posted time (“8h ago”), withdrawn early, or ended. */
  const fundingPostedBadge =
    isWithdrawn && begStatus !== 'funded'
      ? 'Withdrawn early'
      : timeRemaining === 'Expired'
        ? 'Ended'
        : timeAgo;
  const fundingBadgeMuted =
    isWithdrawn && begStatus !== 'funded' ? true : timeRemaining === 'Expired';

  return (
    <Screen backgroundColor="#FFFFFF">
      <MemberProfileModal
        visible={profileModalUserId != null}
        userId={profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View ref={pageContentRef} style={styles.pageContent}>
          <RequestDetailHeader
            onReportPress={openReportBeg}
            onMenuPress={!isOwner && ownerUserId ? onSafetyMenu : undefined}
          />

          <View style={styles.requesterRow}>
            <RequesterAvatar
              size={48}
              initial={initial}
              avatarColor={avatarColor}
              avatarUrl={avatarUrl}
              maskAvatar={isAnonymous}
              previewLabel={name}
            />
            {canViewRequesterProfile || (isOwner && !isAnonymous) ? (
              <Pressable
                style={({ pressed }) => [
                  styles.requesterTapArea,
                  pressed && styles.requesterRowPressed,
                ]}
                onPress={onViewRequesterProfile}
                accessibilityRole="button"
                accessibilityLabel={`View ${name}'s profile`}
              >
                <View style={styles.requesterInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, styles.nameLink]} numberOfLines={1}>
                      {name}
                    </Text>
                    <VerificationStatusDot verified={isOwnerKycVerified} />
                    {isVerifiedRequest ? (
                      <VerifiedByPlzBadge compact />
                    ) : badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name={categoryIcon} size={15} color="#6B7280" style={styles.metaIcon} />
                    <Text style={styles.meta} numberOfLines={1}>
                      {categoryLabel} · {timeAgo}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            ) : (
              <View style={styles.requesterInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <VerificationStatusDot verified={isOwnerKycVerified} />
                  {isVerifiedRequest ? (
                    <VerifiedByPlzBadge compact />
                  ) : badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name={categoryIcon} size={15} color="#6B7280" style={styles.metaIcon} />
                  <Text style={styles.meta} numberOfLines={1}>
                    {categoryLabel} · {timeAgo}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {isAwaitingApproval ? (
            <View style={styles.pendingApprovalBanner}>
              <Ionicons name="hourglass-outline" size={22} color="#B45309" />
              <View style={styles.pendingApprovalTextWrap}>
                <Text style={styles.pendingApprovalTitle}>Pending approval</Text>
                <Text style={styles.pendingApprovalSubtitle}>
                  Your request isn&apos;t visible to the community yet. We&apos;ll notify you when it&apos;s
                  approved.
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.description}>{fullDescription}</Text>

          <View style={styles.reactionsRow}>
            {REACTION_PILLS.map(({ emoji, field }) => (
              <Pressable
                key={field}
                style={[
                  styles.reactionPill,
                  reactions?.userReaction === emoji && styles.reactionPillSelected,
                  reactionBusy === emoji && styles.reactionPillBusy,
                ]}
                onPress={() => void onToggleReaction(emoji)}
                disabled={Boolean(reactionBusy)}
                accessibilityRole="button"
                accessibilityState={{ selected: reactions?.userReaction === emoji }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>
                  {apiReactionCounts.get(emoji) ?? reactionCounts[field] ?? 0}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.fundingCard}>
            <View style={styles.fundingCardTop}>
              <View style={styles.fundingLeft}>
                <Text style={styles.fundingAmount}>
                  {formatNaira(raised)} / {formatNaira(goal)}
                </Text>
                <Text style={styles.stillNeeded}>
                  {formatNaira(amountNeeded)} still needed
                </Text>
              </View>
              <View
                style={[
                  styles.timeBadge,
                  fundingBadgeMuted && styles.timeBadgeMuted,
                  isWithdrawn && begStatus !== 'funded' && styles.timeBadgeWithdrawn,
                ]}
              >
                <Ionicons
                  name={
                    isWithdrawn && begStatus !== 'funded'
                      ? 'wallet-outline'
                      : 'time-outline'
                  }
                  size={14}
                  color={
                    isWithdrawn && begStatus !== 'funded'
                      ? '#4338CA'
                      : fundingBadgeMuted
                        ? '#6B7280'
                        : '#2E8BEA'
                  }
                />
                <Text
                  style={[
                    styles.timeBadgeText,
                    fundingBadgeMuted && styles.timeBadgeTextMuted,
                    isWithdrawn && begStatus !== 'funded' && styles.timeBadgeTextWithdrawn,
                  ]}
                >
                  {fundingPostedBadge}
                </Text>
              </View>
            </View>

            <View style={styles.progressWrap}>
              <ProgressBar percent={percent} height={8} trackColor="#EEEEEE" fillColor="#2E8BEA" />
            </View>

            {isOwner ? (
              <>
                <View style={styles.cardDivider} />

                <View style={styles.breakdownBlock}>
                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>Amount requested</Text>
                    <Text style={styles.breakdownValue}>{formatNaira(goal)}</Text>
                  </View>
                  <View style={styles.breakdownLine}>
                    <View style={styles.breakdownLabelRow}>
                      <Text style={styles.breakdownLabel}>Platform fee ({PLATFORM_FEE_PERCENT}%)</Text>
                      <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                    </View>
                    <Text style={styles.breakdownValueMuted}>-{formatNaira(platformFee)}</Text>
                  </View>
                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>VAT ({VAT_ON_PLATFORM_FEE_PERCENT}% of fee)</Text>
                    <Text style={styles.breakdownValueMuted}>-{formatNaira(vatOnPlatformFee)}</Text>
                  </View>
                  <View style={[styles.breakdownLine, styles.breakdownLineLast]}>
                    <Text style={styles.breakdownReceivesLabel}>Requester receives</Text>
                    <Text style={styles.breakdownReceivesValue}>{formatNaira(requesterReceives)}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {canViewEvidence ? (
            <View style={styles.evidencePanel}>
              <View style={styles.evidenceHeader}>
                <View style={styles.evidenceHeaderCopy}>
                  <Text style={styles.evidenceTitle}>Evidence</Text>
                  <Text style={styles.evidenceSubtitle}>
                    {isOwner
                      ? 'Photos are deleted when the request is fully funded.'
                      : 'Shared by the requester to help donors review this request.'}
                  </Text>
                </View>
                {isOwner ? (
                  <Pressable
                    style={styles.evidenceAddButton}
                    onPress={() => void onAddEvidence()}
                    disabled={evidenceUploading}
                    accessibilityRole="button"
                  >
                    <Ionicons name="image-outline" size={17} color="#2E8BEA" />
                    <Text style={styles.evidenceAddText}>
                      {evidenceUploading ? 'Uploading…' : 'Add'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {evidenceLoading ? (
                <Text style={styles.evidenceEmpty}>Loading evidence…</Text>
              ) : evidence.length === 0 ? (
                <Text style={styles.evidenceEmpty}>No evidence attached yet.</Text>
              ) : (
                evidence.map((item, index) => (
                  <View key={item.id} style={styles.evidenceRow}>
                    <View style={styles.evidenceRowCopy}>
                      <Text style={styles.evidenceFileName} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                      <Text style={styles.evidenceMeta}>
                        {item.fileType} · {Math.ceil(item.fileSize / 1024)} KB
                        {item.isFlagged ? ' · Under review' : ''}
                      </Text>
                      {isOwner ? (
                        <View style={styles.evidenceSensitiveRow}>
                          <Text style={styles.evidenceSensitiveLabel}>Sensitive</Text>
                          <Switch
                            value={Boolean(item.isSensitive)}
                            onValueChange={(next) => onToggleEvidenceSensitivity(item, next)}
                            trackColor={{ false: '#E5E7EB', true: '#2E8BEA' }}
                            thumbColor="#FFFFFF"
                          />
                        </View>
                      ) : null}
                    </View>
                    {item.url ? (
                      <Pressable
                        style={styles.evidenceViewButton}
                        onPress={() => {
                          setSelectedEvidenceIndex(index);
                          setEvidenceViewerOpen(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`View evidence ${index + 1}`}
                      >
                        <Ionicons name="open-outline" size={18} color="#2E8BEA" />
                        <Text style={styles.evidenceViewText}>View</Text>
                      </Pressable>
                    ) : null}
                    {isOwner ? (
                      <Pressable
                        style={styles.evidenceIconButton}
                        onPress={() => onDeleteEvidence(item)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          {isOwner ? (
            <>
              <RequestDonorList
                donations={begDonations}
                total={donorTotal}
                loading={donorsLoading}
              />

              {ownerWithdrawalPending ? (
                <View style={styles.withdrawProcessingNotice}>
                  <Ionicons name="time-outline" size={22} color="#B45309" />
                  <Text style={styles.withdrawProcessingText}>
                    Your withdrawal is being processed. We&apos;ll notify you when it completes.
                  </Text>
                </View>
              ) : null}

              {ownerShowWithdrawCta ? (
                <View style={styles.withdrawCtaBlock}>
                  <CTAButton
                    variant="gradient"
                    label={
                      ownerWithdrawEnabled
                        ? withdrawNowActive
                          ? `Withdraw now · ${formatNaira(raised)}`
                          : `Withdraw ${formatNaira(raised)}`
                        : 'Withdraw now'
                    }
                    onPress={onOwnerWithdrawPress}
                    disabled={!ownerWithdrawEnabled}
                    accessibilityLabel={
                      ownerWithdrawEnabled
                        ? withdrawNowActive
                          ? `Withdraw now ${formatNaira(raised)}`
                          : `Withdraw ${formatNaira(raised)}`
                        : 'Withdraw now — no donations yet'
                    }
                  />
                  {ownerWithdrawEnabled && withdrawNowActive ? (
                    <Text style={styles.withdrawCtaHint}>
                      Withdrawing will end this request and stop further donations.
                    </Text>
                  ) : !ownerWithdrawEnabled && raised <= 0 ? (
                    <Text style={styles.withdrawCtaHint}>
                      Withdraw opens once you receive your first donation.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.ownerNotice}>
                <Ionicons name="information-circle-outline" size={22} color="#2E8BEA" />
                <Text style={styles.ownerNoticeText}>
                  {ownerWithdrawEnabled
                    ? 'Share this request so others can contribute before you withdraw.'
                    : "You can't donate to your own request. Share this request so others can contribute."}
                </Text>
              </View>
            </>
          ) : (
            <>
              {viewerDonation ? (
                <View style={styles.donorNotice}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <View style={styles.donorNoticeTextWrap}>
                    <Text style={styles.donorNoticeTitle}>
                      You donated {formatNaira(viewerDonation.totalAmount)}
                      {viewerDonation.donationCount > 1
                        ? ` (${viewerDonation.donationCount} contributions)`
                        : ''}
                    </Text>
                    <Text style={styles.donorNoticeBody}>
                      {!visitorCanDonate
                        ? 'Thank you for helping fund this request.'
                        : 'Thank you — you can still contribute more if you would like.'}
                    </Text>
                  </View>
                </View>
              ) : !visitorCanDonate ? (
                <View style={styles.closedNotice}>
                  <Ionicons name="lock-closed-outline" size={22} color="#6B7280" />
                  <Text style={styles.closedNoticeText}>
                    {timeRemaining === 'Pending approval'
                      ? 'This request isn&apos;t open for contributions yet.'
                      : 'This request is no longer accepting donations.'}
                  </Text>
                </View>
              ) : null}

              {visitorCanDonate ? (
            <>
              <View
                ref={donationAnchorRef}
                collapsable={false}
                onLayout={() => {
                  if (!pendingDonateScroll.current) return;
                  pendingDonateScroll.current = false;
                  requestAnimationFrame(() => scrollToDonationSection());
                }}
              />
              <Text style={styles.sectionTitle}>Choose Amount</Text>
              <View style={styles.amountGrid}>
                {AMOUNT_OPTIONS.map((opt) => (
                  <View key={opt.value} style={styles.amountGridCell}>
                    <AmountChip
                      label={opt.label}
                      selected={selectedAmount === opt.value}
                      onPress={() => {
                        setAmountTouched(true);
                        setSelectedAmount(opt.value);
                        setCustomAmount('');
                        customAmountRef.current?.blur();
                      }}
                    />
                  </View>
                ))}
              </View>
              <TextInput
                ref={customAmountRef}
                style={[
                  styles.customAmountField,
                  visibleDonationError && styles.customAmountFieldError,
                ]}
                placeholder="Custom Amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={customAmountDisplay}
                onChangeText={(t) => {
                  setAmountTouched(true);
                  setCustomAmount(digitsOnly(t));
                  if (digitsOnly(t)) setSelectedAmount(null);
                }}
                onFocus={() => {
                  setCustomAmountFocused(true);
                  setSelectedAmount(null);
                }}
                onBlur={() => setCustomAmountFocused(false)}
              />
              {visibleDonationError ? (
                <Text style={styles.amountError}>{visibleDonationError}</Text>
              ) : null}

              <View style={styles.privacyCard}>
                <View style={[styles.toggleRow, anonymousModeEnabled && styles.toggleRowLocked]}>
                  <View style={styles.toggleLeft}>
                    <Ionicons
                      name={anonymousModeEnabled ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={anonymousModeEnabled ? '#9CA3AF' : '#1F2937'}
                    />
                    <View style={styles.toggleTextWrap}>
                      <Text style={[styles.toggleTitle, anonymousModeEnabled && styles.toggleTitleLocked]}>
                        Show my name
                      </Text>
                      <Text style={styles.toggleSubtitle}>
                        {anonymousModeEnabled
                          ? 'Disabled because Anonymous Mode is on'
                          : 'If off, your display name stays private when donating anonymously'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={anonymousModeEnabled ? false : showName}
                    onValueChange={anonymousModeEnabled ? undefined : setShowName}
                    disabled={anonymousModeEnabled}
                    trackColor={{ false: '#E5E7EB', true: '#2E8BEA' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E7EB"
                  />
                </View>
              </View>

              <CTAButton
                variant="gradient"
                label={donationSubmitting ? 'Processing…' : 'Continue'}
                onPress={() => void onContinueDonation()}
                disabled={donationSubmitting || Boolean(donationAmountError)}
              />
              {donationProgressMessage ? (
                <Text style={styles.paymentProgressText}>{donationProgressMessage}</Text>
              ) : null}

              <Text style={styles.ctaSubtext}>
                Only {formatNaira(amountNeeded)} needed to complete this request
              </Text>
            </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <DonationThankYouModal
        visible={donationThankYou != null}
        amount={donationThankYou?.amount ?? 0}
        recipientName={donationThankYou?.recipientName ?? ''}
        showRecipientName={donationThankYou?.showRecipientName ?? true}
        donationId={donationThankYou?.donationId}
        onDone={() => {
          setDonationThankYou(null);
          void loadRequest();
        }}
      />
      <BegEvidenceViewerModal
        visible={evidenceViewerOpen}
        evidence={evidence}
        selectedIndex={selectedEvidenceIndex}
        loading={evidenceLoading}
        onClose={() => setEvidenceViewerOpen(false)}
        onSelectIndex={setSelectedEvidenceIndex}
      />
      <ReportContentSheet
        visible={reportVisible}
        target={reportTarget}
        onClose={() => {
          setReportVisible(false);
          setReportTarget(null);
        }}
        onSubmit={async (body) => {
          if (!reportTarget) return;
          await withUnauthorizedRecovery(signOut, async (token) => {
            if (reportTarget.type === 'beg') {
              await reportBeg(token, reportTarget.id, body);
            }
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    width: '100%',
    maxWidth: REQUEST_DETAIL_MAX_WIDTH,
    alignSelf: 'center',
    
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  requesterRowPressable: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginHorizontal: -2,
  },
  requesterTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 4,
  },
  requesterRowPressed: {
    opacity: 0.85,
    backgroundColor: '#F9FAFB',
  },
  requesterInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flexShrink: 1,
  },
  nameLink: {
    color: '#2E8BEA',
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 6,
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    marginBottom: 16,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reactionPillSelected: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#2E8BEA',
  },
  reactionPillBusy: {
    opacity: 0.6,
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  fundingCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  fundingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fundingLeft: {
    flex: 1,
    paddingRight: 8,
  },
  fundingAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  stillNeeded: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeBadgeMuted: {
    backgroundColor: '#F3F4F6',
  },
  timeBadgeWithdrawn: {
    backgroundColor: '#E0E7FF',
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  timeBadgeTextMuted: {
    color: '#6B7280',
  },
  timeBadgeTextWithdrawn: {
    color: '#4338CA',
  },
  progressWrap: {
    marginBottom: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  breakdownBlock: {
    gap: 0,
  },
  breakdownLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLineLast: {
    marginBottom: 0,
    marginTop: 4,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  breakdownValueMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  breakdownReceivesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  breakdownReceivesValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E8BEA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountGridCell: {
    width: '20%',
    marginBottom: 10,
  },
  /** Full-width control styled like Figma “Custom Amount” chip. */
  customAmountField: {
    width: '100%',
    minHeight: 48,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  customAmountFieldError: {
    borderColor: '#DC2626',
  },
  amountError: {
    fontSize: 12,
    lineHeight: 17,
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  privacyCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowLocked: {
    opacity: 0.86,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleTitleLocked: {
    color: '#6B7280',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  ctaSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E8BEA',
    textAlign: 'center',
    marginTop: 12,
  },
  evidencePanel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  evidenceHeaderCopy: {
    flex: 1,
  },
  evidenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  evidenceSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  evidenceAddButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceAddText: {
    color: '#2E8BEA',
    fontWeight: '700',
    fontSize: 13,
  },
  evidenceEmpty: {
    color: '#6B7280',
    fontSize: 13,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  evidenceRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  evidenceFileName: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 13,
  },
  evidenceMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  evidenceSensitiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  evidenceSensitiveLabel: {
    fontSize: 12,
    color: '#374151',
  },
  evidenceIconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  evidenceViewButton: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  evidenceViewText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2E8BEA',
  },
  paymentProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 10,
  },
  pendingApprovalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingApprovalTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  pendingApprovalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  pendingApprovalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B45309',
    fontWeight: '500',
  },
  ownerNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ownerNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E40AF',
    fontWeight: '500',
  },
  withdrawCtaBlock: {
    marginBottom: 16,
    gap: 10,
  },
  withdrawCtaHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  withdrawProcessingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  withdrawProcessingText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#92400E',
    fontWeight: '500',
  },
  donorNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  donorNoticeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  donorNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  donorNoticeBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#047857',
    fontWeight: '500',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    fontWeight: '500',
  },
});
