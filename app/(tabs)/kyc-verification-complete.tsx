import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { getTrustProgress, type TrustProgress } from '@/lib/api/beg';
import { getAccessTokenOrTryRefresh } from '@/lib/auth/session-expired';

function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

function formatCooldown(progress: TrustProgress): string {
  const days = progress.capabilities.cooldownDays;
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = progress.capabilities.cooldownHours;
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

function buildBenefits(progress: TrustProgress | null): string[] {
  if (!progress) {
    return [
      'Verified badge on profile',
      'Higher limits unlock as you donate and build trust',
      'Increased trust with donors',
    ];
  }

  const benefits = [
    `${progress.currentTierBadge} ${progress.currentTierName} trust tier`,
    `Current request limit: ${formatNaira(progress.capabilities.maxAmount)}`,
    `${progress.capabilities.requestsPerDay} approved request${progress.capabilities.requestsPerDay > 1 ? 's' : ''} per day`,
    `Cooldown after approval: ${formatCooldown(progress)}`,
  ];

  if (progress.nextCapabilities && progress.nextTierName) {
    benefits.push(
      `Next: ${progress.nextTierName} unlocks ${formatNaira(progress.nextCapabilities.maxAmount)} requests`
    );
  }

  return benefits;
}

function buildSubtitle(progress: TrustProgress | null): string {
  if (!progress) {
    return 'Your identity has been confirmed. Your trust limits will update as you build donation history.';
  }
  if (!progress.breakdown.hasDonated) {
    return 'Your identity has been confirmed. Make at least one donation to unlock requests above ₦10,000.';
  }
  return `Your identity has been confirmed. You can now request up to ${formatNaira(progress.capabilities.maxAmount)} based on your trust tier.`;
}

export default function KycVerificationCompleteScreen() {
  const { refreshUser } = useCurrentUser();
  const [trustProgress, setTrustProgress] = useState<TrustProgress | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const token = await getAccessTokenOrTryRefresh();
      if (!token) return;
      try {
        const progress = await getTrustProgress(token);
        if (mounted) setTrustProgress(progress);
      } catch {
        if (mounted) setTrustProgress(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const benefits = useMemo(() => buildBenefits(trustProgress), [trustProgress]);

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
          {buildSubtitle(trustProgress)}
        </Text>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Your trust status:</Text>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="checkmark" size={14} color="#2E8BEA" />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
          {trustProgress?.nextTierRequirements.length ? (
            <View style={styles.nextBox}>
              <Text style={styles.nextTitle}>Next unlock</Text>
              <Text style={styles.nextText}>{trustProgress.nextTierRequirements.join(' • ')}</Text>
            </View>
          ) : null}
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
  nextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  nextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nextText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
});
