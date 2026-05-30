import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { formContentStyle } from '@/constants/layout';

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
  link: '#2E8BEA',
} as const;

const CHECK_ICON_BG = '#E8F4FD';

export default function ForgotPasswordConfirmationScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();

  const onBack = () => {
    router.back();
  };

  const onBackToSignIn = () => {
    router.replace('/(auth)/login' as import('expo-router').Href);
  };

  const onTryAgain = () => {
    router.back();
  };

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.heading} />
          </Pressable>
        </View>

        <View style={styles.iconWrapper}>
          <Ionicons name="checkmark" size={56} color={COLORS.brandBlue} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We&apos;ve sent a password reset link to</Text>
        {email ? (
          <Text style={styles.email}>{email}</Text>
        ) : (
          <Text style={styles.emailPlaceholder}>your email address</Text>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            label="Back to Sign In"
            onPress={onBackToSignIn}
            variant="gradient"
            accessibilityLabel="Back to sign in"
          />

          <View style={styles.tryAgainRow}>
            <Text style={styles.tryAgainPrompt}>Didn&apos;t receive the email? </Text>
            <Pressable
              onPress={onTryAgain}
              accessibilityLabel="Try again"
              accessibilityRole="link"
            >
              <Text style={styles.tryAgainLink}>Try again</Text>
            </Pressable>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: CHECK_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.heading,
    marginBottom: 8,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.body,
    marginBottom: 4,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.brandBlue,
    marginBottom: 32,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  emailPlaceholder: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.brandBlue,
    marginBottom: 32,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  actions: {
    width: '100%',
    gap: 24,
  },
  tryAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tryAgainPrompt: {
    fontSize: 14,
    color: COLORS.body,
  },
  tryAgainLink: {
    fontSize: 14,
    color: COLORS.link,
    fontWeight: '600',
  },
});
