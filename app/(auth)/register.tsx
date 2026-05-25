import { zodResolver } from '@hookform/resolvers/zod';
import { OAuthSocialSection } from '@/components/auth/OAuthSocialSection';
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
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { signup } from '@/lib/api/auth';
import { PlizApiError } from '@/lib/api/types';

const LOGO = require('@/assets/images/pliz-logo.png');

/** Aligns with pliz-backend signupValidation + API docs */
const PASSWORD_COMPLEXITY_MESSAGE =
  'Use 8+ characters with upper & lower case, a number, and a special character (@$!%*?&#)';

const signupSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
        PASSWORD_COMPLEXITY_MESSAGE
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  link: '#2E8BEA',
  error: '#DC2626',
} as const;

export default function RegisterScreen() {
  const { refreshUser } = useCurrentUser();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const applyApiFieldErrors = (err: PlizApiError) => {
    const fieldMap: Record<string, keyof SignupFormData> = {
      username: 'username',
      email: 'email',
      password: 'password',
      confirmPassword: 'confirmPassword',
    };
    for (const item of err.errors) {
      const key = fieldMap[item.field];
      if (key) {
        setError(key, { type: 'server', message: item.message });
      }
    }
  };

  const onSignUp = async (data: SignupFormData) => {
    setApiMessage(null);
    setIsSubmitting(true);
    try {
      await signup({
        username: data.username.trim(),
        email: data.email.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      router.replace({
        pathname: '/(auth)/login',
        params: { registered: '1' },
      } as import('expo-router').Href);
    } catch (e) {
      if (e instanceof PlizApiError) {
        applyApiFieldErrors(e);
        if (e.errors.length === 0) {
          setApiMessage(e.message);
        }
      } else {
        setApiMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignIn = () => {
    router.push('/(auth)/login' as import('expo-router').Href);
  };

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Plz</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start your journey with Plz</Text>

        {apiMessage ? (
          <Text style={styles.apiError} accessibilityLiveRegion="polite">
            {apiMessage}
          </Text>
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Username"
                leftIcon="at-outline"
                placeholder="johndoe"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.username?.message}
                accessibilityLabel="Username"
              />
            )}
          />

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
                label="Create Password"
                leftIcon="lock-closed-outline"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!passwordVisible}
                onToggleSecure={() => setPasswordVisible((v) => !v)}
                hint="8+ chars, upper & lower case, number, special (@$!%*?&#)"
                error={errors.password?.message}
                accessibilityLabel="Create password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextInput
                label="Confirm Password"
                leftIcon="lock-closed-outline"
                placeholder="Re-enter your password"
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
            label={isSubmitting ? 'Creating account…' : 'Sign up'}
            onPress={handleSubmit(onSignUp)}
            variant="gradient"
            disabled={isSubmitting || oauthBusy}
            accessibilityLabel="Sign up"
          />
          {isSubmitting ? (
            <ActivityIndicator
              style={styles.spinner}
              color={COLORS.brandBlue}
              accessibilityLabel="Loading"
            />
          ) : null}
        </View>

        <OAuthSocialSection
          refreshUser={refreshUser}
          onOAuthError={setApiMessage}
          onBusyChange={setOauthBusy}
        />

        <View style={styles.signInRow}>
          <Text style={styles.signInPrompt}>Already have an Account? </Text>
          <Pressable onPress={onSignIn} accessibilityLabel="Sign in" accessibilityRole="link">
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.heading,
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.body,
    marginBottom: 28,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  apiError: {
    alignSelf: 'stretch',
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 8,
  },
  spinner: {
    marginTop: 12,
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
