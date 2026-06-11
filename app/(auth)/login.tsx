import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { OAuthSocialSection } from '@/components/auth/OAuthSocialSection';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { z } from 'zod';

import { CTAButton } from '@/components/CTAButton';
import { FormTextInput } from '@/components/FormTextInput';
import { Screen } from '@/components/Screen';
import { formContentStyle } from '@/constants/layout';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { login as loginRequest } from '@/lib/api/auth';
import { PlizApiError, formatLoginErrorForUser } from '@/lib/api/types';
import { setTokens } from '@/lib/auth/access-token';
import { resetSessionRecoveryState } from '@/lib/auth/session-expired';
import {
  enterAuthenticatedApp,
  enterSignupProfile,
} from '@/lib/navigation/auth-navigation';

const LOGO = require('@/assets/images/pliz-logo.png');

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  link: '#2E8BEA',
  error: '#DC2626',
} as const;

export default function LoginScreen() {
  const { refreshUser } = useCurrentUser();
  const { registered, session, passwordReset } = useLocalSearchParams<{
    registered?: string;
    session?: string;
    passwordReset?: string;
  }>();
  const sessionExpired =
    session === 'expired' ||
    (Array.isArray(session) && session.some((s) => s === 'expired'));
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSignIn = async (data: LoginFormData) => {
    setApiMessage(null);
    setIsSubmitting(true);
    try {
      const result = await loginRequest({
        email: data.email,
        password: data.password,
      });
      await setTokens(result.accessToken, result.refreshToken);
      resetSessionRecoveryState();
      await refreshUser();

      if (!result.user.isProfileComplete) {
        enterSignupProfile();
      } else {
        enterAuthenticatedApp('/(tabs)' as import('expo-router').Href);
      }
    } catch (e) {
      if (e instanceof PlizApiError) {
        if (e.errors.length) {
          for (const item of e.errors) {
            if (item.field === 'email') {
              setError('email', { type: 'server', message: item.message });
            }
            if (item.field === 'password') {
              setError('password', { type: 'server', message: item.message });
            }
          }
        }
        if (e.errors.length === 0 || !e.errors.some((x) => x.field === 'email' || x.field === 'password')) {
          setApiMessage(formatLoginErrorForUser(e));
        }
      } else {
        setApiMessage(formatLoginErrorForUser(e));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPassword = () => {
    router.push('/(auth)/forgot-password' as import('expo-router').Href);
  };

  const onRegister = () => {
    router.push('/(auth)/register' as import('expo-router').Href);
  };

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      <View style={styles.content}>
          {/* Logo + brand name (logo centered; Plz left-aligned in content) */}
          <View style={styles.logoSection}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
            
          </View>
          <Text style={styles.appName}>Plz</Text>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in to continue helping or receiving help
          </Text>

          {sessionExpired ? (
            <Text style={styles.sessionExpiredBanner} accessibilityLiveRegion="polite">
              Your session expired or your sign-in is no longer valid. Please sign in again.
            </Text>
          ) : null}

          {passwordReset === '1' ? (
            <Text style={styles.successBanner} accessibilityLiveRegion="polite">
              Password updated. Sign in with your new password.
            </Text>
          ) : null}

          {registered === '1' ? (
            <Text style={styles.successBanner}>
              Account created. Check your inbox and spam folder for the verification email, then sign in to
              complete your profile.
            </Text>
          ) : null}

          {apiMessage ? (
            <Text style={styles.apiError} accessibilityLiveRegion="polite">
              {apiMessage}
            </Text>
          ) : null}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Email Address"
                  leftIcon="person-outline"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.email?.message}
                  accessibilityLabel="Email address"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Password"
                  leftIcon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!passwordVisible}
                  onToggleSecure={() => setPasswordVisible((v) => !v)}
                  error={errors.password?.message}
                  accessibilityLabel="Password"
                />
              )}
            />

            <View style={styles.rememberForgotRow}>
              <Pressable
                onPress={() => setRememberMe((v) => !v)}
                style={styles.rememberRow}
                accessibilityLabel="Remember me"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.rememberLabel}>Remember me</Text>
              </Pressable>
              <Pressable
                onPress={onForgotPassword}
                accessibilityLabel="Forgot password"
                accessibilityRole="link"
              >
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </Pressable>
            </View>

            <CTAButton
              label={isSubmitting ? 'Signing in…' : 'Sign In'}
              onPress={handleSubmit(onSignIn)}
              variant="gradient"
              disabled={isSubmitting || oauthBusy}
              accessibilityLabel="Sign in"
            />
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.brandBlue} style={styles.spinner} />
            ) : null}
          </View>

          <OAuthSocialSection
            refreshUser={refreshUser}
            onOAuthError={setApiMessage}
            onBusyChange={setOauthBusy}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don&apos;t have an Account? </Text>
            <Pressable onPress={onRegister} accessibilityLabel="Register" accessibilityRole="link">
              <Text style={styles.registerLink}>Register</Text>
            </Pressable>
          </View>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    ...formContentStyle,
    alignItems: 'stretch',
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.brandBlue,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.heading,
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.body,
    marginBottom: 28,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  sessionExpiredBanner: {
    alignSelf: 'stretch',
    fontSize: 14,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  successBanner: {
    alignSelf: 'stretch',
    fontSize: 14,
    color: '#166534',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    lineHeight: 20,
  },
  apiError: {
    alignSelf: 'stretch',
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 12,
  },
  form: {
    width: '100%',
    marginBottom: 8,
  },
  rememberForgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.body,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
  },
  rememberLabel: {
    fontSize: 15,
    color: COLORS.heading,
    fontWeight: '500',
  },
  forgotLink: {
    fontSize: 14,
    color: COLORS.link,
    fontWeight: '500',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    flexWrap: 'wrap',
  },
  registerPrompt: {
    fontSize: 14,
    color: COLORS.body,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.link,
    fontWeight: '600',
  },
});
