import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

type VerifiedByPlzBadgeProps = {
  compact?: boolean;
};

export function VerifiedByPlzBadge({ compact = false }: VerifiedByPlzBadgeProps) {
  return (
    <View
      style={[styles.badge, compact && styles.badgeCompact]}
      accessibilityRole="text"
      accessibilityLabel="Verified request"
    >
      <Ionicons name="shield-checkmark" size={compact ? 12 : 14} color="#047857" />
      <Text style={[styles.text, compact && styles.textCompact]}>Verified Request</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  textCompact: {
    fontSize: 10,
  },
});
