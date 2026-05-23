import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Text';

import { ProgressBar } from '@/components/ProgressBar';
import { RequesterAvatar } from '@/components/request/RequesterAvatar';

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
 * Uses Link asChild + TouchableOpacity for reliable iOS navigation.
 * TouchableOpacity works better than Pressable inside ScrollView on iOS.
 * Link asChild delegates navigation to expo-router's native linking.
 */
export function RequestCard({ request }: RequestCardProps) {
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
  } = request;

  return (
    <View style={styles.cardWrapper}>
      <Link
        href={{ pathname: '/(tabs)/request/[id]', params: { id } }}
        asChild
        push
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`Request by ${name}: ${text.slice(0, 50)}...`}
        >
          <View style={styles.topRow}>
            <RequesterAvatar
              size={40}
              initial={initial}
              avatarColor={avatarColor}
              avatarUrl={avatarUrl}
              maskAvatar={name.toLowerCase() === 'anonymous'}
            />
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.timeAgo}>
              {expiresInLabel ? `${timeAgo} · ${expiresInLabel}` : timeAgo}
            </Text>
          </View>

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
  card: {
    padding: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
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
});
