import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Text';

import { ProgressBar } from '@/components/ProgressBar';
import { BegEvidenceButton } from '@/components/evidence/BegEvidenceButton';
import { BegCardDonateButton } from '@/components/request/BegCardDonateButton';
import { RequesterAvatar } from '@/components/request/RequesterAvatar';
import { VerifiedByPlzBadge } from '@/components/safety/VerifiedByPlzBadge';
import { VERIFIED_BY_PLZ_BADGE } from '@/lib/api/beg';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

import type { TrendingRequest } from '@/lib/types/home';

const ACCENT_BLUE = '#2196F3';
const HEADING = '#333333';
const BODY = '#888888';
const DESCRIPTION = '#555555';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

export interface RequestCardProps {
  request: TrendingRequest;
}

/**
 * Avatar sits outside the navigation Link so tapping it opens photo preview only.
 * Card body uses Link asChild + TouchableOpacity for reliable iOS navigation.
 */
export function RequestCard({ request }: RequestCardProps) {
  const { user } = useCurrentUser();
  const {
    id,
    name,
    initial,
    avatarColor,
    avatarUrl,
    timeAgo,
    expiresInLabel,
    text,
    raised,
    goal,
    percent,
    evidenceCount,
    ownerUserId,
    canDonate,
    badge,
  } = request;

  const href = { pathname: '/(tabs)/request/[id]' as const, params: { id } };
  const isAnonymous = name.toLowerCase() === 'anonymous';
  const isOwner = Boolean(user?.id && ownerUserId && user.id === ownerUserId);
  const showActionButton = isOwner || Boolean(canDonate);

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.topRow}>
        <RequesterAvatar
          size={40}
          initial={initial}
          avatarColor={avatarColor}
          avatarUrl={avatarUrl}
          maskAvatar={isAnonymous}
          previewPhoto
          previewLabel={name}
        />
        <Link href={href} asChild push>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.topRowLink}
            accessibilityRole="button"
            accessibilityLabel={`Request by ${name}`}
          >
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {badge === VERIFIED_BY_PLZ_BADGE ? (
              <VerifiedByPlzBadge compact />
            ) : null}
            <Text style={styles.timeAgo}>
              {expiresInLabel ? `${timeAgo} · ${expiresInLabel}` : timeAgo}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Link href={href} asChild push>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cardBody}
          accessibilityRole="button"
          accessibilityLabel={`Request by ${name}: ${text.slice(0, 50)}...`}
        >
          <Text style={styles.text} numberOfLines={3}>
            {text}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>
              {formatNaira(raised)} of {formatNaira(goal)}
            </Text>
            <Text style={styles.percent}>{percent}%</Text>
          </View>

          <ProgressBar percent={percent} trackColor="#EEEEEE" fillColor="#2196F3" />
        </TouchableOpacity>
      </Link>

      {(evidenceCount && evidenceCount > 0) || showActionButton ? (
        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            {evidenceCount && evidenceCount > 0 ? (
              <BegEvidenceButton begId={id} evidenceCount={evidenceCount} compact />
            ) : null}
          </View>
          {showActionButton ? (
            <View style={styles.actionRight}>
              <BegCardDonateButton
                begId={id}
                recipientName={name}
                variant={isOwner ? 'view' : 'donate'}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  topRowLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBody: {
    padding: 0,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: HEADING,
  },
  timeAgo: {
    fontSize: 13,
    color: BODY,
  },
  text: {
    fontSize: 14,
    color: DESCRIPTION,
    lineHeight: 20,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amount: {
    fontSize: 14,
    color: HEADING,
  },
  percent: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionLeft: {
    flex: 1,
    minWidth: 0,
  },
  actionRight: {
    flexShrink: 0,
  },
});
