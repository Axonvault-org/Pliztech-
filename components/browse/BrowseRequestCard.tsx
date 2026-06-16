import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Text';

import { ProgressBar } from '@/components/ProgressBar';
import { BegCardDonateButton } from '@/components/request/BegCardDonateButton';
import { RequesterAvatar } from '@/components/request/RequesterAvatar';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { REQUEST_CATEGORIES } from '@/constants/categories';

import type { BrowseRequest } from '@/lib/types/home';

const ACCENT_BLUE = '#2196F3';
const HEADING = '#333333';
const BODY = '#888888';
const DESCRIPTION = '#555555';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function getCategoryIcon(categoryId: string) {
  const cat = REQUEST_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.icon ?? 'help-outline';
}

export interface BrowseRequestCardProps {
  request: BrowseRequest;
  onPress?: () => void;
}

export function BrowseRequestCard({ request, onPress }: BrowseRequestCardProps) {
  const { user } = useCurrentUser();
  const {
    id,
    name,
    initial,
    avatarColor,
    avatarUrl,
    timeLeft,
    categoryId,
    categoryLabel,
    badge,
    text,
    raised,
    goal,
    percent,
    ownerUserId,
    canDonate,
  } = request;

  const categoryIcon = getCategoryIcon(categoryId);
  const href = { pathname: '/(tabs)/request/[id]' as const, params: { id } };
  const isAnonymous = name.toLowerCase() === 'anonymous';
  const isOwner = Boolean(user?.id && ownerUserId && user.id === ownerUserId);
  const showActionButton = isOwner || Boolean(canDonate);

  return (
    <View style={styles.card}>
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
            onPress={onPress}
          >
            <View style={styles.nameWrap}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.timeLeft}>
              <Ionicons name="time-outline" size={14} color={BODY} />
              <Text style={styles.timeLeftText}>{timeLeft}</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      <Link href={href} asChild push>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cardBody}
          accessibilityRole="button"
          accessibilityLabel={`Request by ${name}: ${text.slice(0, 50)}...`}
          onPress={onPress}
        >
          <View style={styles.categoryRow}>
            <Ionicons name={categoryIcon as keyof typeof Ionicons.glyphMap} size={16} color={BODY} />
            <Text style={styles.categoryLabel}>{categoryLabel}</Text>
          </View>

          <Text style={styles.text} numberOfLines={3}>
            {text}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>
              <Text style={styles.amountRaised}>{formatNaira(raised)}</Text>
              {' / '}
              {formatNaira(goal)}
            </Text>
            <Text style={styles.percent}>{percent}%</Text>
          </View>

          <ProgressBar percent={percent} trackColor="#EEEEEE" fillColor="#2196F3" />
        </TouchableOpacity>
      </Link>

      {showActionButton ? (
        <View style={styles.donateRow}>
          <BegCardDonateButton
            begId={id}
            recipientName={name}
            variant={isOwner ? 'view' : 'donate'}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 24,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBody: {
    padding: 0,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: HEADING,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: BODY,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
  },
  timeLeftText: {
    fontSize: 12,
    color: BODY,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  categoryLabel: {
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
    color: BODY,
  },
  amountRaised: {
    fontWeight: '700',
    color: HEADING,
  },
  percent: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  donateRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
