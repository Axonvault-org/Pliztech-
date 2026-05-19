import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

type KycRejectionBannerProps = {
  reason: string;
};

export function KycRejectionBanner({ reason }: KycRejectionBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={20} color="#B45309" />
      <Text style={styles.text}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#92400E',
    fontWeight: '500',
  },
});
