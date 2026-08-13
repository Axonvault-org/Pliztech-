import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';

const BRAND_BLUE = '#2E8BEA';

export type BegCardActionButtonProps = {
  begId: string;
  recipientName?: string;
  /** Donate for others; View opens your own request detail. */
  variant?: 'donate' | 'view';
};

/**
 * Compact CTA for beg feed cards — bottom-right donate or view (owner).
 */
export function BegCardDonateButton({
  begId,
  recipientName,
  variant = 'donate',
}: BegCardActionButtonProps) {
  const isView = variant === 'view';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/request/[id]',
          params: isView ? { id: begId } : { id: begId, donate: '1' },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={
        isView
          ? 'View your request'
          : recipientName
            ? `Donate to ${recipientName}`
            : 'Donate to this request'
      }
    >
      <Ionicons
        name={isView ? 'eye-outline' : 'heart'}
        size={14}
        color={BRAND_BLUE}
      />
      <Text style={styles.label}>
        {isView ? 'View' : 'Donate'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_BLUE,
  },
});
