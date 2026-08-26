import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { exchangeHandoffCode } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';
import { setTokens } from '@/lib/auth/access-token';
import { resetSessionRecoveryState } from '@/lib/auth/session-expired';
import { enterAuthenticatedApp } from '@/lib/navigation/auth-navigation';

const LOGO = require('@/assets/images/pliz-logo.png');

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  error: '#DC2626',
} as const;

function pickCodeParam(
  code: string | string[] | undefined
): string | undefined {
  if (code == null) return undefined;
  const s = Array.isArray(code) ? code[0] : code;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

/**
 * Native entry after web email verification — exchanges one-time handoff code for tokens.
 */
export default function AuthHandoffScreen() {
  const { code: codeParam } = useLocalSearchParams<{
    code?: string | string[];
  }>();
  const code = useMemo(() => pickCodeParam(codeParam), [codeParam]);
  const { refreshUser } = useCurrentUser();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setMessage(
        'This sign-in link is missing a code. Verify your email in the browser, then tap Open Plz app again.'
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await exchangeHandoffCode(code);
        if (cancelled) return;
        await setTokens(result.accessToken, result.refreshToken);
        resetSessionRecoveryState();
        await refreshUser();
        enterAuthenticatedApp('/(tabs)/(main)' as import('expo-router').Href);
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
  }, [code, refreshUser]);

  return (
    <Screen backgroundColor={COLORS.background} centerVertical>
      <View style={styles.hero}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Signing you in</Text>
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
                label="Go to sign in"
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
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
