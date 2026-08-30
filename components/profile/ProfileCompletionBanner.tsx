import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

const CARD_BG = '#EFF6FF';
const BORDER = '#93C5FD';
const ICON_CIRCLE_BG = '#DBEAFE';
const ICON_COLOR = '#2563EB';
const TITLE_COLOR = '#1D4ED8';
const SUBTITLE_COLOR = '#1E40AF';
const CTA_COLOR = '#1E3A8A';

export type ProfileCompletionBannerProps = {
  onPress: () => void;
};

/** Prompt to complete profile when deferred from sign-up (PLZ-23). */
export function ProfileCompletionBanner({ onPress }: ProfileCompletionBannerProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Complete your profile"
    >
      <View style={styles.iconCircle}>
        <Ionicons name="person-outline" size={28} color={ICON_COLOR} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Add your details when you are ready to request support from the community
        </Text>
        <Text style={styles.cta}>
          Complete profile <Text style={styles.ctaArrow}>→</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.92,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ICON_CIRCLE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: TITLE_COLOR,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: SUBTITLE_COLOR,
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 10,
  },
  cta: {
    fontSize: 15,
    fontWeight: '700',
    color: CTA_COLOR,
  },
  ctaArrow: {
    fontWeight: '700',
  },
});
