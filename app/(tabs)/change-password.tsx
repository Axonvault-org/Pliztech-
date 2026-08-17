import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { CTAButton } from '@/components/CTAButton';
import { FormTextInput } from '@/components/FormTextInput';
import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { changePassword } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

const BORDER_GRAY = '#E5E7EB';
const SECTION_TITLE = '#6B7280';
const BODY_GRAY = '#6B7280';
const TITLE_DARK = '#1F2937';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const { signOut } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const submit = useCallback(
    async (values: FormValues, retriedAfterRefresh = false) => {
      setSubmitting(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          Alert.alert('Session expired', 'Please sign in again.');
          router.replace('/(auth)/login');
          return;
        }

        const message = await changePassword(accessToken, {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        });

        router.replace({
          pathname: '/(tabs)/change-password-success',
          params: { message },
        });
      } catch (e) {
        if (e instanceof PlizApiError) {
          const hasFieldErrors = e.errors.some((err) =>
            ['currentPassword', 'newPassword', 'confirmPassword'].includes(err.field)
          );
          if (hasFieldErrors) {
            for (const err of e.errors) {
              if (err.field === 'currentPassword') {
                setError('currentPassword', { type: 'server', message: err.message });
              }
              if (err.field === 'newPassword') {
                setError('newPassword', { type: 'server', message: err.message });
              }
              if (err.field === 'confirmPassword') {
                setError('confirmPassword', { type: 'server', message: err.message });
              }
            }
            return;
          }

          if (isUnauthorizedSessionError(e) && !retriedAfterRefresh) {
            const recovered = await recoverFromUnauthorized(signOut);
            if (recovered) {
              return await submit(values, true);
            }
            return;
          }

          Alert.alert('Could not change password', e.message);
          return;
        }
        Alert.alert('Could not change password', 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [setError, signOut]
  );

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Change password" backIconColor={TITLE_DARK} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Password</Text>
        <View style={styles.card}>
          <Text style={styles.intro}>
            Enter your current password, then choose a strong new password. Other sessions will be
            signed out for your security.
          </Text>

          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Current password"
                leftIcon="lock-closed-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showCurrent}
                onToggleSecure={() => setShowCurrent((v) => !v)}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                error={errors.currentPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="New password"
                leftIcon="key-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showNew}
                onToggleSecure={() => setShowNew((v) => !v)}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                hint="Use upper & lower case, a number, and a special character"
                error={errors.newPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Confirm new password"
                leftIcon="lock-closed-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirm}
                onToggleSecure={() => setShowConfirm((v) => !v)}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <View style={styles.ctaWrap}>
            <CTAButton
              label={submitting ? 'Updating…' : 'Update password'}
              onPress={() => void handleSubmit((values) => submit(values))()}
              variant="gradient"
              disabled={submitting}
              accessibilityLabel="Update password"
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: SECTION_TITLE,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: BODY_GRAY,
    marginBottom: 20,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
});
