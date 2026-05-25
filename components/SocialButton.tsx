import { CTA_GRADIENT } from '@/constants/cta-buttons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

const HEIGHT = 56;
const BORDER_RADIUS = 999;
const BORDER_COLOR = '#D1D5DB';
const LABEL_COLOR = '#111827';

export type SocialProvider = 'apple' | 'google';

const PROVIDER_CONFIG: Record<
  SocialProvider,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  apple: { icon: 'logo-apple', label: 'Apple' },
  google: { icon: 'logo-google', label: 'Google' },
};

export interface SocialButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function SocialButton({
  provider,
  onPress,
  accessibilityLabel,
  disabled = false,
}: SocialButtonProps) {
  const { icon, label } = PROVIDER_CONFIG[provider];
  const a11y = accessibilityLabel ?? `Sign in with ${label}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={a11y}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={LABEL_COLOR} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignSelf: 'stretch',
    height: CTA_GRADIENT.height,
    borderRadius: CTA_GRADIENT.borderRadius,
    overflow: 'hidden',
    paddingVertical: CTA_GRADIENT.paddingVertical,
    paddingHorizontal: CTA_GRADIENT.paddingHorizontal,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexDirection: 'row',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: LABEL_COLOR,
  },
});
