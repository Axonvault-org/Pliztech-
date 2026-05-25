import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { enterAuthenticatedApp } from '@/lib/navigation/auth-navigation';

// -----------------------------------------------------------------------------
// Constants (no magic numbers)
// -----------------------------------------------------------------------------
const COLORS = {
  background: '#FFFFFF',
  footerFrom: '#9CA3AF',
  footerCompany: '#4B5563',
} as const;

const SPACING = {
  logoSize: 380,
  eclipseSize: 400,
  slideUpDistance: 80,
  footerBottomPadding: 32,
} as const;

const FONT = {
  footerFromSize: 14,
  footerCompanySize: 18,
  footerCompanyWeight: '600' as const,
} as const;

  const SPLASH_DURATION_MS = 3500;
  const NEXT_ROUTE = '/(public)/welcome';

// Logo asset
const LOGO_SOURCE: ImageSourcePropType = require('@/assets/images/pliz-logo.png');

const BOUNCE_SPRING = { damping: 10, stiffness: 90 } as const;

export default function SplashScreen() {
  const hasNavigated = useRef(false);
  const { user, isLoading } = useCurrentUser();

  const logoTranslateY = useSharedValue<number>(SPACING.slideUpDistance);
  const fromTranslateX = useSharedValue<number>(-40);

  useEffect(() => {
    // 1. Logo slides up from the eclipse with a subtle bounce
    logoTranslateY.value = withSpring(0, BOUNCE_SPRING);

    // 2. "from" text slides in from the left (900ms)
    fromTranslateX.value = withDelay(900, withTiming(0, { duration: 400 }));
  }, [logoTranslateY, fromTranslateX]);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        enterAuthenticatedApp();
      }
      return;
    }

    const t = setTimeout(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(NEXT_ROUTE);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [user, isLoading]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const fromAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fromTranslateX.value }],
  }));

  return (
    <Screen backgroundColor={COLORS.background} contentStyle={styles.screenContent}>
      <View style={styles.centerSection}>
        <View style={[styles.eclipse, { width: SPACING.eclipseSize, height: SPACING.eclipseSize }]}>
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Image
              source={LOGO_SOURCE}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Plz app logo"
              accessibilityRole="image"
            />
          </Animated.View>
        </View>
      </View>
      <View style={styles.footer}>
        <Animated.Text
          style={[styles.footerFrom, fromAnimatedStyle]}
          accessibilityLabel="from"
          accessibilityRole="text"
        >
          from
        </Animated.Text>
        <Text
          style={styles.footerCompany}
          accessibilityLabel="Axonvault Innovations"
          accessibilityRole="text"
        >
          Axonvault Innovations
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eclipse: {
    borderRadius: 9999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: SPACING.logoSize,
    height: SPACING.logoSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: SPACING.logoSize,
    height: SPACING.logoSize,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.footerBottomPadding,
  },
  footerFrom: {
    fontSize: FONT.footerFromSize,
    fontWeight: '500',
    color: COLORS.footerFrom,
    marginBottom: 2,
  },
  footerCompany: {
    fontSize: FONT.footerCompanySize,
    fontWeight: FONT.footerCompanyWeight,
    color: COLORS.footerCompany,
  },
});
