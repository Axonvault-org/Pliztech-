import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

const UNLOCKED_BENEFITS = [
  'Verified badge on profile',
  'Higher request limits (up to ₦100,000)',
  'Priority support from the Pliz team',
  'Increased trust with donors',
] as const;

export default function KycVerificationCompleteScreen() {
  const { refreshUser } = useCurrentUser();

  const goToProfile = useCallback(() => {
    void refreshUser();
    router.replace('/(tabs)/(main)/profile');
  }, [refreshUser]);

  const goToDashboard = useCallback(() => {
    void refreshUser();
    router.replace('/(tabs)/(main)');
  }, [refreshUser]);

  return (
    <Screen backgroundColor="#FFFFFF" scrollable centerVertical>
      <View style={styles.content}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark" size={48} color="#22C55E" />
        </View>

        <Text style={styles.title}>You&apos;re Verified</Text>
        <Text style={styles.subtitle}>
          Your identity has been confirmed. You can now have access to higher request limits and a
          verified trust badge
        </Text>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>What you&apos;ve unlocked:</Text>
          {UNLOCKED_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="checkmark" size={14} color="#2E8BEA" />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <CTAButton
            label="Back to Profile"
            onPress={goToProfile}
            variant="gradient"
            accessibilityLabel="Back to Profile"
          />
          <CTAButton
            label="Go to Dashboard"
            onPress={goToDashboard}
            variant="transparent"
            accessibilityLabel="Go to Dashboard"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  benefitsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
});
