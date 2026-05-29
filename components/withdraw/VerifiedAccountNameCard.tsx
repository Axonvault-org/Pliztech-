import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

export type VerifiedAccountNameCardProps = {
  accountName: string;
};

/**
 * Shown after bank account resolve on the Enter Bank Details step (Figma).
 */
export function VerifiedAccountNameCard({ accountName }: VerifiedAccountNameCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Account Name</Text>
      <Text style={styles.value}>{accountName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2E8BEA',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 6,
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
});
