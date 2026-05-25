import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import {
  CTA_BLUE,
  CTA_COLORS,
  CTA_GRADIENT,
  CTA_TRANSPARENT,
  CTA_WHITE,
} from '@/constants/cta-buttons';

export type CTAButtonVariant = 'gradient' | 'white' | 'transparent' | 'blue';

export interface CTAButtonProps {
  label: string;
  onPress: () => void;
  variant?: CTAButtonVariant;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Renders before the label (e.g. paper plane for “Share story”). */
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export function CTAButton({
  label,
  onPress,
  variant = 'gradient',
  accessibilityLabel = label,
  disabled = false,
  leftIcon,
}: CTAButtonProps) {
  const iconColor =
    variant === 'gradient' || variant === 'blue'
      ? CTA_COLORS.white
      : CTA_COLORS.blueStart;

  const content = (
    <>
      {leftIcon ? (
        <Ionicons
          name={leftIcon}
          size={20}
          color={iconColor}
          style={styles.leftIcon}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'gradient' && styles.labelWhite,
          variant === 'white' && styles.labelBlue,
          variant === 'transparent' && styles.labelBlue,
          variant === 'blue' && styles.labelWhite,
        ]}
      >
        {label}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'gradient' && styles.buttonGradient,
        variant === 'white' && styles.buttonWhite,
        variant === 'transparent' && styles.buttonTransparent,
        variant === 'blue' && styles.buttonBlue,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {variant === 'gradient' && (
        <LinearGradient
          colors={[...CTA_GRADIENT.gradientColors]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.inner}>{content}</View>
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
  },
  buttonGradient: {
    // LinearGradient provides background
  },
  buttonWhite: {
    backgroundColor: CTA_WHITE.backgroundColor,
  },
  buttonTransparent: {
    backgroundColor: 'transparent',
    borderWidth: CTA_TRANSPARENT.borderWidth,
    borderColor: CTA_COLORS.blueStart, // gradient border approximated
  },
  buttonBlue: {
    backgroundColor: CTA_BLUE.backgroundColor,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  leftIcon: {
    marginRight: 2,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
  },
  labelWhite: {
    color: CTA_COLORS.white,
  },
  labelBlue: {
    color: CTA_COLORS.blueStart,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
