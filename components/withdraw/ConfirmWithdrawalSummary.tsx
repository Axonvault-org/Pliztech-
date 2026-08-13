import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { PLATFORM_FEE_PERCENT, VAT_ON_PLATFORM_FEE_PERCENT } from '@/lib/withdrawal-fees';

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

function SummaryRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export type ConfirmWithdrawalSummaryProps = {
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

export function ConfirmWithdrawalSummary({
  emoji,
  title,
  donorSubtitle,
  bankName,
  accountNumber,
  accountName,
  withdrawalAmountNaira,
  companyFee,
  vatFee,
  amountToReceive,
}: ConfirmWithdrawalSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.requestBlock}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.requestText}>
          <Text style={styles.requestTitle} numberOfLines={3}>
            {title}
          </Text>
          <Text style={styles.donorLine}>{donorSubtitle}</Text>
        </View>
      </View>

      <View style={styles.hr} />

      <SummaryRow label="Bank" value={bankName} valueStyle={styles.valueStrong} />
      <SummaryRow label="Account" value={accountNumber} valueStyle={styles.valueStrong} />
      <SummaryRow label="Account Name" value={accountName} valueStyle={styles.valueStrong} />

      <View style={styles.hr} />

      <SummaryRow
        label="Withdrawal Amount"
        value={formatNaira(withdrawalAmountNaira)}
        valueStyle={styles.valueStrong}
      />
      <SummaryRow
        label={`Platform fee (${PLATFORM_FEE_PERCENT}%)`}
        value={formatNaira(-companyFee)}
        valueStyle={styles.feeNegative}
      />
      <SummaryRow
        label={`VAT (${VAT_ON_PLATFORM_FEE_PERCENT}% of fee)`}
        value={formatNaira(-vatFee)}
        valueStyle={styles.feeNegative}
      />

      <View style={styles.hr} />

      <SummaryRow
        label="You’ll receive"
        value={formatNaira(amountToReceive)}
        valueStyle={styles.receiveValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requestBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
    lineHeight: 34,
  },
  requestText: {
    flex: 1,
    minWidth: 0,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  donorLine: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 0,
    maxWidth: '46%',
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  valueStrong: {
    fontWeight: '700',
    color: '#111827',
  },
  feeNegative: {
    fontWeight: '700',
    color: '#DC2626',
  },
  receiveValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
});
