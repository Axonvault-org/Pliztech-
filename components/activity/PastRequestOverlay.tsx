import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CTAButton } from '@/components/CTAButton';
import { ProgressBar } from '@/components/ProgressBar';
import { StorySubmittedModal } from '@/components/story/StorySubmittedModal';
import { Text } from '@/components/Text';
import { avatarColorFromSeed, useCurrentUser } from '@/contexts/CurrentUserContext';
import {
    begFeedItemToRequestDetail,
    formatBegCreatedTimeAgo,
    getBegById,
} from '@/lib/api/beg';
import { getBegDonations, type BegDonationApiItem } from '@/lib/api/donations';
import { getReactions, toggleReaction, type ReactionsPayload } from '@/lib/api/reactions';
import { createStory } from '@/lib/api/stories';
import { formatPlizApiErrorForUser, PlizApiError } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import type { ActivityRequest, ActivityRequestStatus } from '@/lib/types/activity';
import type { RequestDetail } from '@/lib/types/requests';

const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const TITLE = '#1F2937';
const MUTED = '#6B7280';
const BLUE = '#2E8BEA';
const GREEN = '#059669';
const SECTION_BLUE = '#1E40AF';
/** Matches backend story validation (500 chars, 60 words, min 10 chars). */
const STORY_MAX_CHARS = 500;
const STORY_MAX_WORDS = 60;
const STORY_MIN_CHARS = 10;
const REACTION_PILLS = ['👍', '❤️', '😂'];

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function statusMeta(status: ActivityRequestStatus): { label: string; showCheck: boolean } {
  switch (status) {
    case 'funded':
      return { label: 'Fully Funded', showCheck: true };
    case 'expired':
      return { label: 'Ended', showCheck: false };
    case 'withdrawn':
      return { label: 'Withdrawn early', showCheck: false };
    case 'cancelled':
      return { label: 'Cancelled', showCheck: false };
    case 'pending':
      return { label: 'Pending approval', showCheck: false };
    case 'active':
      return { label: 'Active', showCheck: false };
    default:
      return { label: 'Closed', showCheck: false };
  }
}

function donorInitial(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  if (t.toLowerCase() === 'anonymous') return '?';
  return t.charAt(0).toUpperCase();
}

export interface PastRequestOverlayProps {
  visible: boolean;
  onClose: () => void;
  /** Row from Activity list (title, status, time, icon while loading). */
  summary: ActivityRequest | null;
}

export function PastRequestOverlay({ visible, onClose, summary }: PastRequestOverlayProps) {
  const insets = useSafeAreaInsets();
  const { signOut } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [donations, setDonations] = useState<BegDonationApiItem[]>([]);
  const [reactions, setReactions] = useState<ReactionsPayload | null>(null);
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [testimony, setTestimony] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  /** API error from “Share story” (shown above the testimony field). */
  const [shareError, setShareError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!summary?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [b, d] = await Promise.all([
        getBegById(summary.id),
        getBegDonations(summary.id, { page: 1, limit: 50 }),
      ]);
      setDetail(begFeedItemToRequestDetail(b));
      setDonations(d.donations);
      try {
        const reactionData = await withUnauthorizedRecovery(signOut, (token) =>
          getReactions(token, 'beg', summary.id)
        );
        setReactions(reactionData);
      } catch {
        setReactions(null);
      }
    } catch (e) {
      setDetail(null);
      setDonations([]);
      setReactions(null);
      setError(
        e instanceof PlizApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not load this request.'
      );
    } finally {
      setLoading(false);
    }
  }, [signOut, summary?.id]);

  useEffect(() => {
    if (!visible || !summary?.id) {
      setDetail(null);
      setDonations([]);
      setReactions(null);
      setError(null);
      setTestimony('');
      setShareError(null);
      return;
    }
    void load();
  }, [visible, summary?.id, load]);

  const meta = summary ? statusMeta(summary.status) : { label: '', showCheck: false };
  const raised = detail?.raised ?? 0;
  const goal = detail?.goal ?? summary?.amount ?? 0;
  const pct = detail?.percent ?? (goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0);

  const title = summary?.title ?? 'Request';
  const timeAgo = summary?.timeAgo ?? detail?.timeAgo ?? '';
  const categoryIcon = (summary?.icon ?? 'help-outline') as keyof typeof Ionicons.glyphMap;

  const thumbsUp = detail?.thumbsUp ?? 0;
  const hearts = detail?.hearts ?? 0;
  const gifts = detail?.gifts ?? 0;
  const apiReactionCounts = new Map(
    (reactions?.reactions ?? []).map((reaction) => [reaction.emoji, reaction.count])
  );
  const reactionTotal =
    reactions?.totalReactions ?? thumbsUp + hearts + gifts;

  const onToggleReaction = async (emoji: string) => {
    if (!summary?.id || reactionBusy) return;
    setReactionBusy(emoji);
    try {
      const data = await withUnauthorizedRecovery(signOut, (token) =>
        toggleReaction(token, 'beg', summary.id, emoji)
      );
      setReactions(data);
    } catch (e) {
      Alert.alert('Could not react', formatPlizApiErrorForUser(e));
    } finally {
      setReactionBusy(null);
    }
  };

  const testimonyTrimmed = testimony.trim();
  const wordCount = countWords(testimonyTrimmed);
  const testimonyTooLong =
    testimonyTrimmed.length > STORY_MAX_CHARS || wordCount > STORY_MAX_WORDS;
  const canShareStory =
    testimonyTrimmed.length >= STORY_MIN_CHARS && !testimonyTooLong && !shareSubmitting;

  const onShareStory = () => {
    const content = testimonyTrimmed;
    if (content.length < STORY_MIN_CHARS) {
      Alert.alert(
        'Add your story',
        `Please write at least ${STORY_MIN_CHARS} characters about how this help made a difference.`
      );
      return;
    }
    if (content.length > STORY_MAX_CHARS) {
      Alert.alert('Too long', `Stories can be at most ${STORY_MAX_CHARS} characters.`);
      return;
    }
    if (countWords(content) > STORY_MAX_WORDS) {
      Alert.alert('Too long', `Stories can be at most ${STORY_MAX_WORDS} words.`);
      return;
    }

    setShareError(null);
    setShareSubmitting(true);
    void (async () => {
      try {
        await withUnauthorizedRecovery(signOut, async (token) => {
          const { message } = await createStory(token, { content });
          setShareError(null);
          onClose();
          setTestimony('');
          setSuccessMessage(message);
        });
      } catch (e) {
        setShareError(formatPlizApiErrorForUser(e));
      } finally {
        setShareSubmitting(false);
      }
    })();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color={TITLE} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading && !detail ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={styles.loadingText}>Loading request…</Text>
            </View>
          ) : null}

          {error && !detail ? (
            <View style={styles.loadingBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {detail && summary ? (
            <>
              <View style={styles.titleRow}>
                <View style={styles.titleIconWrap}>
                  <Ionicons name={categoryIcon} size={22} color="#6B7280" />
                </View>
                <Text style={styles.mainTitle}>{title}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {timeAgo}
                  {meta.label ? ` · ${meta.label}` : ''}
                </Text>
                {meta.showCheck ? (
                  <Ionicons name="checkmark-circle" size={18} color={GREEN} style={styles.metaCheck} />
                ) : null}
              </View>

              <View style={styles.amountCard}>
                <View style={styles.amountCardTop}>
                  <View style={styles.amountCardLeft}>
                    <Ionicons name="trending-up" size={20} color={BLUE} />
                    <Text style={styles.amountCardTitle}>Amount reached</Text>
                  </View>
                  <View style={[styles.pctBadge, pct >= 100 && styles.pctBadgeFull]}>
                    <Text style={[styles.pctBadgeText, pct >= 100 && styles.pctBadgeTextFull]}>
                      {pct}%
                    </Text>
                  </View>
                </View>
                <ProgressBar percent={pct} height={10} trackColor="#E5E7EB" fillColor={BLUE} />
                <View style={styles.amountRow}>
                  <Text style={styles.amountRaised}>{formatNaira(raised)}</Text>
                  <Text style={styles.amountOf}>of {formatNaira(goal)}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>
                <Text style={styles.sectionEmoji}>👥 </Text>
                Donor ({donations.length})
              </Text>
              {donations.length === 0 && !loading ? (
                <Text style={styles.emptyDonors}>No public donor list yet.</Text>
              ) : null}
              {donations.map((row) => {
                const name = row.donor_name?.trim() || 'Anonymous';
                const initial = donorInitial(name);
                const color = avatarColorFromSeed(row.id);
                return (
                  <View key={row.id} style={styles.donorCard}>
                    <View style={[styles.donorAvatar, { backgroundColor: color }]}>
                      <Text style={styles.donorAvatarText}>{initial}</Text>
                    </View>
                    <View style={styles.donorInfo}>
                      <Text style={styles.donorName}>{name}</Text>
                      <Text style={styles.donorTime}>
                        {formatBegCreatedTimeAgo(row.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.donorAmount}>{formatNaira(Number(row.amount) || 0)}</Text>
                  </View>
                );
              })}

              <Text style={styles.sectionHeading}>
                <Text style={styles.sectionEmoji}>✨ </Text>
                Reaction ({reactionTotal})
              </Text>
              <View style={styles.reactionRow}>
                {REACTION_PILLS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[
                      styles.reactionPill,
                      reactions?.userReaction === emoji && styles.reactionPillSelected,
                      reactionBusy === emoji && styles.reactionPillBusy,
                    ]}
                    onPress={() => void onToggleReaction(emoji)}
                    disabled={Boolean(reactionBusy)}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${emoji}`}
                    accessibilityState={{ selected: reactions?.userReaction === emoji }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>
                      {apiReactionCounts.get(emoji) ??
                        (emoji === '👍' ? thumbsUp : emoji === '❤️' ? hearts : gifts)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.testimonyHeader}>
                <Text style={styles.sectionHeadingInline}>
                  <Text style={styles.sectionEmoji}>❝ </Text>
                  Your testimony
                </Text>
              </View>
              <Text style={styles.testimonyHint}>
                Share how this help made a difference (10–{STORY_MAX_CHARS} characters, max{' '}
                {STORY_MAX_WORDS} words).
              </Text>
              {shareError ? (
                <View
                  style={styles.shareErrorBox}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.shareErrorText}>{shareError}</Text>
                </View>
              ) : null}
              <TextInput
                style={styles.testimonyInput}
                placeholder="e.g. Thanks to the community, I made it to my interview and later got the job!"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={STORY_MAX_CHARS}
                value={testimony}
                onChangeText={(t) => {
                  setShareError(null);
                  setTestimony(t);
                }}
                textAlignVertical="top"
              />
              <Text
                style={[styles.charCount, testimonyTooLong && styles.charCountError]}
              >
                {wordCount}/{STORY_MAX_WORDS} words · {testimony.length}/{STORY_MAX_CHARS}{' '}
                characters
                {testimonyTrimmed.length > 0 && testimonyTrimmed.length < STORY_MIN_CHARS
                  ? ` · At least ${STORY_MIN_CHARS} characters`
                  : ''}
              </Text>

              <View style={styles.ctaWrap}>
                {shareSubmitting ? (
                  <ActivityIndicator
                    style={{ marginBottom: 12 }}
                    color={BLUE}
                    accessibilityLabel="Submitting story"
                  />
                ) : null}
                <CTAButton
                  variant="gradient"
                  label={shareSubmitting ? 'Sharing…' : 'Share story'}
                  leftIcon="paper-plane-outline"
                  onPress={onShareStory}
                  accessibilityLabel="Share story"
                  disabled={!canShareStory}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
        </View>
      </Modal>
      <StorySubmittedModal
        visible={successMessage != null}
        message={successMessage ?? undefined}
        onDone={() => {
          setSuccessMessage(null);
          router.replace('/(tabs)/(main)' as Href);
        }}
        onViewStories={() => {
          setSuccessMessage(null);
          router.replace('/(tabs)/stories-feed' as Href);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: MUTED,
  },
  errorText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BLUE,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  titleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TITLE,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaText: {
    fontSize: 14,
    color: MUTED,
  },
  metaCheck: {
    marginLeft: 6,
  },
  amountCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  amountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TITLE,
  },
  pctBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pctBadgeFull: {
    backgroundColor: '#D1FAE5',
  },
  pctBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  pctBadgeTextFull: {
    color: GREEN,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
  },
  amountRaised: {
    fontSize: 18,
    fontWeight: '700',
    color: TITLE,
  },
  amountOf: {
    fontSize: 14,
    color: MUTED,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: SECTION_BLUE,
    marginBottom: 12,
  },
  sectionHeadingInline: {
    fontSize: 16,
    fontWeight: '700',
    color: SECTION_BLUE,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  emptyDonors: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 16,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  donorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  donorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  donorInfo: {
    flex: 1,
    minWidth: 0,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '700',
    color: TITLE,
  },
  donorTime: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  donorAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  reactionPillSelected: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: BLUE,
  },
  reactionPillBusy: {
    opacity: 0.6,
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  reactionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: TITLE,
  },
  testimonyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  testimonyHint: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 18,
  },
  shareErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  shareErrorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B91C1C',
  },
  testimonyInput: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: TITLE,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 20,
  },
  charCountError: {
    color: '#DC2626',
    fontWeight: '600',
  },
  ctaWrap: {
    alignItems: 'center',
    width: '100%',
  },
});
