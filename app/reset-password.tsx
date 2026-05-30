import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { z } from 'zod';

import { CTAButton } from '@/components/CTAButton';
import { FormTextInput } from '@/components/FormTextInput';
import { Screen } from '@/components/Screen';
import { formContentStyle } from '@/constants/layout';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { submitPasswordReset } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';

const LOGO = require('@/assets/images/pliz-logo.png');

/** Aligns with pliz-backend `resetPasswordValidation` for `newPassword`. */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        PASSWORD_REGEX,
        'Use upper & lower case, a number, and a special character (@$!%*?&#)'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  link: '#2E8BEA',
  error: '#DC2626',
} as const;

function pickTokenParam(
  token: string | string[] | undefined
): string | undefined {
  if (token == null) return undefined;
  const s = Array.isArray(token) ? token[0] : token;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

/**
 * Root-level recovery route — outside `(auth)` so email links work while logged in on web.
 * Email links use `/reset-password?token=...` (same path, no auth-layout redirects).
 */
export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => pickTokenParam(tokenParam), [tokenParam]);
  const { signOut } = useCurrentUser();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    setApiMessage(null);
    setIsSubmitting(true);
    try {
      await submitPasswordReset({
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      await signOut();
      router.replace('/(auth)/login?passwordReset=1' as import('expo-router').Href);
    } catch (e) {
      if (e instanceof PlizApiError) {
        for (const item of e.errors) {
          if (item.field === 'newPassword') {
            setError('newPassword', { type: 'server', message: item.message });
          }
          if (item.field === 'confirmPassword') {
            setError('confirmPassword', { type: 'server', message: item.message });
          }
          if (item.field === 'token') {
            setApiMessage(item.message);
          }
        }
        if (
          e.errors.length === 0 ||
          !e.errors.some(
            (x) =>
              x.field === 'newPassword' ||
              x.field === 'confirmPassword' ||
              x.field === 'token'
          )
        ) {
          setApiMessage(e.message);
        }
      } else {
        setApiMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBack = () => {
    router.replace('/(auth)/login' as import('expo-router').Href);
  };

  const onRequestNewLink = () => {
    router.push('/(auth)/forgot-password' as import('expo-router').Href);
  };

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={styles.backTap}
            accessibilityLabel="Back to sign in"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
          </Pressable>
        </View>

        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Plz</Text>
        <Text style={styles.welcomeTitle}>Set a new password</Text>
        <Text style={styles.welcomeSubtitle}>
          Choose a strong password you haven&apos;t used before on this account.
          {token ? ' You will sign in again with your new password after updating.' : ''}
        </Text>

        {!token ? (
          <View style={styles.missingToken}>
            <Text style={styles.missingTokenText}>
              This link is missing a reset token. Open the link from your email,
              or request a new reset link.
            </Text>
            <Pressable
              onPress={onRequestNewLink}
              style={styles.linkButton}
              accessibilityRole="button"
              accessibilityLabel="Request new reset link"
            >
              <Text style={styles.linkButtonText}>Forgot password</Text>
            </Pressable>
          </View>
        ) : null}

        {token && apiMessage ? (
          <Text style={styles.apiError} accessibilityLiveRegion="polite">
            {apiMessage}
          </Text>
        ) : null}

        {token ? (
          <View style={styles.form}>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="New password"
                  leftIcon="lock-closed-outline"
                  placeholder="At least 8 characters"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!passwordVisible}
                  onToggleSecure={() => setPasswordVisible((v) => !v)}
                  error={errors.newPassword?.message}
                  accessibilityLabel="New password"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormTextInput
                  label="Confirm password"
                  leftIcon="lock-closed-outline"
                  placeholder="Re-enter password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!confirmVisible}
                  onToggleSecure={() => setConfirmVisible((v) => !v)}
                  error={errors.confirmPassword?.message}
                  accessibilityLabel="Confirm password"
                />
              )}
            />

            <CTAButton
              label={isSubmitting ? 'Updating…' : 'Update password'}
              onPress={handleSubmit(onSubmit)}
              variant="gradient"
              disabled={isSubmitting}
              accessibilityLabel="Update password"
            />
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.brandBlue} style={styles.spinner} />
            ) : null}
          </View>
        ) : null}
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
  topBar: {
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  backTap: {
    alignSelf: 'flex-start',
    padding: 8,
    marginLeft: -8,
    marginTop: -4,
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
    marginBottom: 24,
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 20,
  },
  missingToken: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  missingTokenText: {
    fontSize: 14,
    color: COLORS.body,
    lineHeight: 20,
    marginBottom: 16,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.link,
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
});
