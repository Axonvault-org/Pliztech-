import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { getReactions, toggleReaction, type ReactionsPayload } from '@/lib/api/reactions';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

const BLUE = '#2E8BEA';
const TITLE = '#111827';
const MUTED = '#6B7280';
const BADGE_BORDER = '#2E8BEA';
const BADGE_BG = '#EFF6FF';
const REACTION_EMOJIS = ['👍', '❤️', '🙏', '🥳'];

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function recipientEncouragementName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return 'them';
  return t.split(/\s+/)[0] ?? t;
}

export type DonationThankYouModalProps = {
  visible: boolean;
  onDone: () => void;
  amount: number;
  recipientName: string;
  /** When true, show “{name} will see your first name…”. When false, show anonymous copy. */
  showRecipientName: boolean;
  /** Successful donation id. When present, emoji reactions are stored against the donation. */
  donationId?: string | null;
};

export function DonationThankYouModal({
  visible,
  onDone,
  amount,
  recipientName,
  showRecipientName,
  donationId,
}: DonationThankYouModalProps) {
  const insets = useSafeAreaInsets();
  const { signOut } = useCurrentUser();
  const [reactions, setReactions] = useState<ReactionsPayload | null>(null);
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const encouragementTarget = recipientEncouragementName(recipientName);
  const displayRecipient =
    recipientName.trim() || 'the recipient';
  const reactionCounts = useMemo(
    () => new Map((reactions?.reactions ?? []).map((r) => [r.emoji, r.count])),
    [reactions?.reactions]
  );

  useEffect(() => {
    if (!visible || !donationId) {
      setReactions(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const data = await withUnauthorizedRecovery(signOut, (token) =>
          getReactions(token, 'donation', donationId)
        );
        if (!cancelled) setReactions(data);
      } catch {
        if (!cancelled) setReactions(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [donationId, signOut, visible]);

  const onToggleReaction = useCallback(
    async (emoji: string) => {
      if (!donationId || reactionBusy) return;
      setReactionBusy(emoji);
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const data = await withUnauthorizedRecovery(signOut, (token) =>
          toggleReaction(token, 'donation', donationId, emoji)
        );
        setReactions(data);
      } catch (e) {
        Alert.alert('Could not react', formatPlizApiErrorForUser(e));
      } finally {
        setReactionBusy(null);
      }
    },
    [donationId, reactionBusy, signOut]
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDone}>
      <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.iconCluster}>
            <View style={styles.sparkleTL}>
              <Text style={styles.sparkleText}>✦</Text>
            </View>
            <View style={styles.sparkleTR}>
              <Text style={styles.sparkleText}>✦</Text>
            </View>
            <View style={styles.sparkleTM}>
              <Text style={styles.sparkleTextSmall}>✦</Text>
            </View>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heading}>Thank You!</Text>

          <Text style={styles.bodyLine}>
            <Text style={styles.bodyMuted}>Your </Text>
            <Text style={styles.bodyAmount}>{formatNaira(amount)}</Text>
            <Text style={styles.bodyMuted}> donation to </Text>
            <Text style={styles.bodyName}>{displayRecipient}</Text>
            <Text style={styles.bodyMuted}> is on its way.</Text>
          </Text>

          {showRecipientName ? (
            <Text style={styles.privacyLine}>
              {displayRecipient} will see your first name with your donation.
            </Text>
          ) : (
            <Text style={styles.privacyLine}>
              Your donation will appear anonymously to {displayRecipient}.
            </Text>
          )}

          <View style={styles.differenceBadge}>
            <Text style={styles.differenceBadgeText}>You made a difference today</Text>
          </View>

          <Text style={styles.encouragePrompt}>
            Send {encouragementTarget} some encouragement
          </Text>

          <View style={styles.reactionRow}>
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={[
                  styles.reactionBtn,
                  reactions?.userReaction === emoji && styles.reactionBtnSelected,
                  reactionBusy === emoji && styles.reactionBtnBusy,
                ]}
                onPress={() => void onToggleReaction(emoji)}
                disabled={!donationId || Boolean(reactionBusy)}
                accessibilityLabel={`React with ${emoji}`}
                accessibilityRole="button"
                accessibilityState={{ selected: reactions?.userReaction === emoji }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>{reactionCounts.get(emoji) ?? 0}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onDone}
            style={styles.doneOuter}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <LinearGradient
              colors={['#5BA8F0', '#1a3a5c']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneLabel}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const CHECK_SIZE = 88;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconCluster: {
    width: CHECK_SIZE + 36,
    height: CHECK_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleTL: {
    position: 'absolute',
    top: 2,
    left: 0,
  },
  sparkleTR: {
    position: 'absolute',
    top: 0,
    right: 4,
  },
  sparkleTM: {
    position: 'absolute',
    top: -4,
    right: 28,
  },
  sparkleText: {
    fontSize: 18,
    color: BLUE,
    fontWeight: '700',
  },
  sparkleTextSmall: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '700',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: TITLE,
    textAlign: 'center',
    marginBottom: 16,
  },
  bodyLine: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  bodyMuted: {
    color: MUTED,
  },
  bodyAmount: {
    color: BLUE,
    fontWeight: '700',
  },
  bodyName: {
    color: TITLE,
    fontWeight: '700',
  },
  privacyLine: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  differenceBadge: {
    borderWidth: 1,
    borderColor: BADGE_BORDER,
    backgroundColor: BADGE_BG,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
  },
  differenceBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: BLUE,
    textAlign: 'center',
  },
  encouragePrompt: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 14,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  reactionBtn: {
    minWidth: 58,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
  },
  reactionBtnSelected: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: BLUE,
  },
  reactionBtnBusy: {
    opacity: 0.6,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: TITLE,
  },
  doneOuter: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  doneLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
