import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { formatBegCreatedTimeAgo } from '@/lib/api/beg';
import type { BegDonationApiItem } from '@/lib/api/donations';
import { avatarColorFromSeed } from '@/contexts/CurrentUserContext';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function donorInitial(name: string): string {
  const t = name.trim();
  if (!t || t.toLowerCase() === 'anonymous') return '?';
  return t.charAt(0).toUpperCase();
}

type RequestDonorListProps = {
  donations: BegDonationApiItem[];
  total: number;
  loading?: boolean;
};

export function RequestDonorList({ donations, total, loading }: RequestDonorListProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Donors ({total})</Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2E8BEA" />
        </View>
      ) : total === 0 ? (
        <Text style={styles.empty}>
          No donations yet. Share your request so others can contribute.
        </Text>
      ) : (
        donations.map((row) => {
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
                <Text style={styles.donorTime}>{formatBegCreatedTimeAgo(row.created_at)}</Text>
              </View>
              <Text style={styles.donorAmount}>{formatNaira(Number(row.amount) || 0)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    fontWeight: '500',
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  donorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  donorInfo: {
    flex: 1,
    minWidth: 0,
  },
  donorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  donorTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  donorAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});
