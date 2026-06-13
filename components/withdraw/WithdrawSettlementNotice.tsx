import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { WITHDRAWAL_SETTLEMENT_DISCLAIMER } from '@/lib/withdrawal/copy';

export function WithdrawSettlementNotice() {
  return (
    <View style={styles.box}>
      <Ionicons name="information-circle-outline" size={22} color="#6B7280" style={styles.icon} />
      <Text style={styles.text}>{WITHDRAWAL_SETTLEMENT_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    fontWeight: '500',
  },
});
