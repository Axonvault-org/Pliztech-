import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { WithdrawalApiItem } from '@/lib/api/withdrawals';
import {
  formatWithdrawalDate,
  formatWithdrawalNaira,
  formatWithdrawalTimeAgo,
  maskAccountNumber,
  withdrawalStatusUi,
} from '@/lib/withdrawal/history-display';
import { WITHDRAWAL_FAILED_USER_MESSAGE } from '@/lib/withdrawal/copy';

export type WithdrawalHistoryCardProps = {
  item: WithdrawalApiItem;
  onPress?: () => void;
};

export function WithdrawalHistoryCard({ item, onPress }: WithdrawalHistoryCardProps) {
  const status = withdrawalStatusUi(item.status);
  const bankLine = `${item.bank_account.bank_name} · ${maskAccountNumber(item.bank_account.account_number)}`;
  const submitted = formatWithdrawalDate(item.created_at);
  const timeAgo = formatWithdrawalTimeAgo(item.created_at);

  const content = (
    <>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={2}>
            {item.beg.title}
          </Text>
          <Text style={styles.meta}>
            {submitted} · {timeAgo}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>You received</Text>
        <Text style={styles.amountValue}>{formatWithdrawalNaira(item.amount_received)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="business-outline" size={16} color="#9CA3AF" style={styles.detailIcon} />
        <Text style={styles.detailText} numberOfLines={1}>
          {bankLine}
        </Text>
      </View>

      {item.transfer_reference ? (
        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={styles.detailIcon} />
          <Text style={styles.detailText} numberOfLines={1}>
            Ref: {item.transfer_reference}
          </Text>
        </View>
      ) : null}

      {item.failure_reason && (item.status === 'failed' || item.status === 'rejected') ? (
        <Text style={styles.failureText} numberOfLines={3}>
          {WITHDRAWAL_FAILED_USER_MESSAGE}
        </Text>
      ) : null}

      {onPress ? (
        <View style={styles.chevronRow}>
          <Text style={styles.viewRequest}>View request</Text>
          <Ionicons name="chevron-forward" size={16} color="#2E8BEA" />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Withdrawal for ${item.beg.title}, ${status.label}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  failureText: {
    marginTop: 10,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  chevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 2,
  },
  viewRequest: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8BEA',
  },
});
