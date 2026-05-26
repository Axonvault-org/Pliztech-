import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

export function WithdrawFundsShieldNotice() {
  return (
    <View style={styles.box}>
      <Ionicons name="shield-checkmark" size={22} color="#2E8BEA" style={styles.icon} />
      <Text style={styles.text}>
        Withdrawals are processed securely to your bank account. You’ll need your Transaction PIN
        to confirm.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#1E40AF',
    fontWeight: '500',
  },
});
