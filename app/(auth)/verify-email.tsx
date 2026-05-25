import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { verifyEmailWithToken } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';
import { setTokens } from '@/lib/auth/access-token';
import { resetSessionRecoveryState } from '@/lib/auth/session-expired';
import {
  enterAuthenticatedApp,
  enterSignupProfile,
} from '@/lib/navigation/auth-navigation';

const LOGO = require('@/assets/images/pliz-logo.png');

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  error: '#DC2626',
} as const;

function pickTokenParam(
  token: string | string[] | undefined
): string | undefined {
  if (token == null) return undefined;
  const s = Array.isArray(token) ? token[0] : token;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

export default function VerifyEmailScreen() {
  const { token: tokenParam } = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const token = useMemo(() => pickTokenParam(tokenParam), [tokenParam]);
  const { refreshUser } = useCurrentUser();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(
        'This verification link is missing a token. Request a new email from the sign-in screen.'
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await verifyEmailWithToken(token);
        if (cancelled) return;
        await setTokens(result.accessToken, result.refreshToken);
        resetSessionRecoveryState();
        await refreshUser();
        if (!result.user.isProfileComplete) {
          enterSignupProfile();
        } else {
          enterAuthenticatedApp('/(tabs)' as import('expo-router').Href);
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        if (e instanceof PlizApiError) {
          setMessage(e.message);
        } else {
          setMessage('Something went wrong. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, refreshUser]);

  return (
    <Screen
      backgroundColor={COLORS.background}
      centerVertical
      header={
        <View style={styles.headerRow}>
          <Pressable
            onPress={() =>
              router.replace('/(auth)/login' as import('expo-router').Href)
            }
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.heading} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.hero}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Verifying your email</Text>
        {status === 'loading' && (
          <>
            <ActivityIndicator
              size="large"
              color={COLORS.brandBlue}
              style={styles.spinner}
            />
            <Text style={styles.subtitle}>One moment…</Text>
          </>
        )}
        {status === 'error' && message && (
          <>
            <Text style={styles.errorText}>{message}</Text>
            <View style={styles.ctaWrap}>
              <CTAButton
                label="Back to sign in"
                onPress={() =>
                  router.replace('/(auth)/login' as import('expo-router').Href)
                }
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.body,
    textAlign: 'center',
    marginTop: 12,
  },
  spinner: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaWrap: {
    alignSelf: 'stretch',
    maxWidth: 320,
    width: '100%',
  },
});
