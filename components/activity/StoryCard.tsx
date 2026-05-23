import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

const QUOTE_ICON = require('@/assets/images/quote-icon.png');

function formatNaira(amount: number) {
  return '\u20A6' + amount.toLocaleString();
}

/** Carousel card payload (API-mapped). */
export type StoryCardData = {
  id: string;
  text: string;
  authorName: string;
  authorInitial: string;
  amountReceived: number;
  role: 'Receiver' | 'Giver';
};

export interface StoryCardProps {
  story: StoryCardData;
}

export function StoryCard({ story }: StoryCardProps) {
  const {
    text,
    authorName,
    authorInitial,
    amountReceived,
    role,
  } = story;

  const helpText =
    role === 'Receiver' && amountReceived > 0
      ? `Received help - ${formatNaira(amountReceived)}`
      : role === 'Giver'
        ? 'Community supporter'
        : 'Received help';

  return (
    <View style={styles.card}>
      <Image source={QUOTE_ICON} style={styles.quoteIcon} contentFit="contain" />
      <Text style={styles.text}>{text}</Text>
      <View style={styles.separator} />
      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{authorInitial}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.helpText}>{helpText}</Text>
        </View>
        <View style={[styles.roleTag, role === 'Receiver' && styles.roleTagReceiver]}>
          <Text style={[styles.roleText, role === 'Receiver' && styles.roleTextReceiver]}>
            {role}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  quoteIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
    tintColor: '#5c6168',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  roleTagReceiver: {
    backgroundColor: '#D1FAE5',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextReceiver: {
    color: '#059669',
  },
});
