import { GoogleSignInWebButton } from '@/components/auth/GoogleSignInWebButton';
import { SocialButton } from '@/components/SocialButton';
import { Text } from '@/components/Text';
import { SOCIAL_OAUTH_ENABLED } from '@/constants/features';
import { loginWithApple, loginWithGoogle } from '@/lib/api/auth';
import { formatLoginErrorForUser } from '@/lib/api/types';
import { applyOAuthLoginResult } from '@/lib/auth/oauth-session';
import { signInWithApple } from '@/lib/auth/social/apple-sign-in';
import { isGoogleSignInConfigured, signInWithGoogleNative } from '@/lib/auth/social/google-sign-in';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

const COLORS = {
  brandBlue: '#2E8BEA',
  body: '#6B7280',
} as const;

type OAuthSocialSectionProps = {
  refreshUser: () => Promise<void>;
  /** Surface OAuth failures (e.g. next to the form). Pass null to clear. */
  onOAuthError?: (message: string | null) => void;
  /** Parent can disable primary CTA while OAuth is in progress. */
  onBusyChange?: (busy: boolean) => void;
};

export function OAuthSocialSection({
  refreshUser,
  onOAuthError,
  onBusyChange,
}: OAuthSocialSectionProps) {
  const [oauthBusy, setOauthBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleWebConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim());

  const setBusy = useCallback(
    (busy: boolean) => {
      setOauthBusy(busy);
      onBusyChange?.(busy);
    },
    [onBusyChange]
  );

  useEffect(() => {
    if (!SOCIAL_OAUTH_ENABLED || Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }
    let cancelled = false;
    void import('expo-apple-authentication').then((AppleAuthentication) => {
      if (cancelled) return;
      void AppleAuthentication.isAvailableAsync().then((ok) => {
        if (!cancelled) setAppleAvailable(ok);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onGoogleWebToken = useCallback(
    async (idToken: string) => {
      onOAuthError?.(null);
      setBusy(true);
      try {
        const result = await loginWithGoogle(idToken);
        await applyOAuthLoginResult(result, refreshUser);
      } catch (e) {
        onOAuthError?.(formatLoginErrorForUser(e));
      } finally {
        setBusy(false);
      }
    },
    [refreshUser, setBusy, onOAuthError]
  );

  const onGoogleNative = useCallback(async () => {
    onOAuthError?.(null);
    setBusy(true);
    try {
      const idToken = await signInWithGoogleNative();
      const result = await loginWithGoogle(idToken);
      await applyOAuthLoginResult(result, refreshUser);
    } catch (e) {
      if (e instanceof Error && e.message === 'GOOGLE_CANCELLED') {
        return;
      }
      onOAuthError?.(formatLoginErrorForUser(e));
    } finally {
      setBusy(false);
    }
  }, [refreshUser, setBusy, onOAuthError]);

  const onApple = useCallback(async () => {
    onOAuthError?.(null);
    setBusy(true);
    try {
      const { idToken, firstName, lastName } = await signInWithApple();
      const result = await loginWithApple({ idToken, firstName, lastName });
      await applyOAuthLoginResult(result, refreshUser);
    } catch (e) {
      onOAuthError?.(formatLoginErrorForUser(e));
    } finally {
      setBusy(false);
    }
  }, [refreshUser, setBusy, onOAuthError]);

  if (!SOCIAL_OAUTH_ENABLED) {
    return null;
  }

  return (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialColumn}>
        {Platform.OS === 'ios' && appleAvailable ? (
          <SocialButton provider="apple" onPress={() => void onApple()} disabled={oauthBusy} />
        ) : null}
        {Platform.OS === 'web' ? (
          googleWebConfigured ? (
            <GoogleSignInWebButton onIdToken={onGoogleWebToken} disabled={oauthBusy} />
          ) : (
            <Text style={styles.oauthHint}>
              Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (same as API GOOGLE_CLIENT_ID) to enable Google
              sign-in on web.
            </Text>
          )
        ) : isGoogleSignInConfigured() ? (
          <SocialButton provider="google" onPress={() => void onGoogleNative()} disabled={oauthBusy} />
        ) : (
          <Text style={styles.oauthHint}>
            Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to match your API server&apos;s GOOGLE_CLIENT_ID
            for Google sign-in.
          </Text>
        )}
        {oauthBusy ? (
          <ActivityIndicator color={COLORS.brandBlue} style={styles.oauthSpinner} />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.body,
    opacity: 0.4,
  },
  dividerText: {
    fontSize: 14,
    color: COLORS.body,
  },
  socialColumn: {
    width: '100%',
    gap: 12,
  },
  oauthHint: {
    fontSize: 13,
    color: COLORS.body,
    textAlign: 'center',
    lineHeight: 18,
  },
  oauthSpinner: {
    marginTop: 4,
  },
});
