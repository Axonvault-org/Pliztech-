import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { z } from 'zod';

import { CTAButton } from '@/components/CTAButton';
import { FormTextInput } from '@/components/FormTextInput';
import { Screen } from '@/components/Screen';
import { formContentStyle } from '@/constants/layout';
import { requestForgotPassword } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';

const LOGO = require('@/assets/images/pliz-logo.png');

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  link: '#2E8BEA',
  error: '#DC2626',
} as const;

export default function ForgotPasswordScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSendResetLink = async (data: ForgotPasswordFormData) => {
    setApiMessage(null);
    setIsSubmitting(true);
    try {
      await requestForgotPassword(data.email);
      router.push({
        pathname: '/(auth)/forgot-password-confirmation',
        params: { email: data.email.trim() },
      });
    } catch (e) {
      if (e instanceof PlizApiError) {
        if (e.errors.length) {
          for (const item of e.errors) {
            if (item.field === 'email') {
              setError('email', { type: 'server', message: item.message });
            }
          }
        }
        if (
          e.errors.length === 0 ||
          !e.errors.some((x) => x.field === 'email')
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
    router.back();
  };

  const onSignIn = () => {
    router.replace('/(auth)/login' as import('expo-router').Href);
  };

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={styles.backTap}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
          </Pressable>
        </View>

        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Plz</Text>
        <Text style={styles.welcomeTitle}>Forgot password?</Text>
        <Text style={styles.welcomeSubtitle}>
          No worries — enter your email and we&apos;ll send you a reset link if an
          account exists.
        </Text>

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

          <CTAButton
            label={isSubmitting ? 'Sending…' : 'Send Reset Link'}
            onPress={handleSubmit(onSendResetLink)}
            variant="gradient"
            disabled={isSubmitting}
            accessibilityLabel="Send reset link"
          />
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.brandBlue} style={styles.spinner} />
          ) : null}
        </View>

        <View style={styles.signInRow}>
          <Text style={styles.signInPrompt}>Remember your password? </Text>
          <Pressable
            onPress={onSignIn}
            accessibilityLabel="Sign in"
            accessibilityRole="link"
          >
            <Text style={styles.signInLink}>Sign in</Text>
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
    marginBottom: 28,
    textAlign: 'left',
    alignSelf: 'stretch',
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
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    flexWrap: 'wrap',
  },
  signInPrompt: {
    fontSize: 14,
    color: COLORS.body,
  },
  signInLink: {
    fontSize: 14,
    color: COLORS.link,
    fontWeight: '600',
  },
});
