import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { CTAButton } from '@/components/CTAButton';
import { KycRejectionBanner } from '@/components/kyc/KycRejectionBanner';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getKycStatus,
  resetKycAfterRejection,
  resendKycPhoneOtp,
  sendKycPhoneOtp,
  verifyKycPhoneOtp,
  type KycStatusPayload,
} from '@/lib/api/kyc';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import { submitAndWaitForKycResult } from '@/lib/kyc/submit-flow';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
  withUnauthorizedRecovery,
} from '@/lib/auth/session-expired';

const RESEND_COOLDOWN_SEC = 60;

function identityReviewInFlight(
  verification: KycStatusPayload['verification'] | undefined
): boolean {
  if (!verification?.verificationType) return false;
  return verification.status === 'pending' || verification.status === 'under_review';
}

/** Masks a phone number for display, revealing only the last 3 digits. */
function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return phone;
  if (digits.length <= 3) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 3) + digits.slice(-3);
}

export default function KycVerificationScreen() {
  const { refreshUser, signOut } = useCurrentUser();

  const [status, setStatus] = useState<KycStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => {
      setResendSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const loadStatus = useCallback(
    async (retryAfterRefresh = false, options?: { silent?: boolean }) => {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getKycStatus(token);
        setStatus(data);
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadStatus(true, options);
            return;
          }
        }
        if (!options?.silent) {
          const msg = formatPlizApiErrorForUser(e) || 'Could not load verification status.';
          Alert.alert('Error', msg);
        }
        setStatus(null);
      } finally {
        setLoading(false);
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus])
  );

  const verification = status?.verification;

  useEffect(() => {
    if (verification?.isVerified || verification?.status === 'verified') {
      router.replace('/(tabs)/kyc-verification-complete');
    }
  }, [verification?.isVerified, verification?.status]);

  const steps = status?.steps ?? [];
  const ui = status?.ui;

  const showPhoneSection = steps[0]?.completed === true && steps[1]?.completed === false;

  const showDocumentForm =
    steps[1]?.completed === true &&
    steps[2]?.completed !== true &&
    !verification?.isVerified &&
    !identityReviewInFlight(verification) &&
    (verification?.status !== 'rejected' || verification?.canRetry === true);

  const showFinalSubmit =
    !verification?.isVerified &&
    !identityReviewInFlight(verification) &&
    verification?.verificationType === 'nin' &&
    verification?.documentVerified === true &&
    verification?.status !== 'rejected';

  const handleUiPrimary = async () => {
    if (!ui) return;
    const url = ui.buttonUrl;

    if (url.startsWith('mailto:')) {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      return;
    }

    if (url === '/kyc/status') {
      await loadStatus();
      return;
    }

    if (url === '/begs/create') {
      router.replace('/(tabs)/kyc-verification-complete');
      return;
    }

    if (url === '/kyc/update') {
      setKycBusy(true);
      try {
        await withUnauthorizedRecovery(signOut, (token) => resetKycAfterRejection(token));
        await loadStatus();
      } catch (e) {
        if (isUnauthorizedSessionError(e)) return;
        const msg = formatPlizApiErrorForUser(e) || 'Could not restart verification.';
        Alert.alert('Could not restart', msg);
      } finally {
        setKycBusy(false);
      }
      return;
    }

    if (url === '/kyc/start') {
      if (!steps[0]?.completed) {
        router.push('/(tabs)/personal-info');
        return;
      }
      if (!steps[1]?.completed) {
        Alert.alert(
          'Verify your phone',
          'Confirm the phone number on your profile — we will send a code by SMS.'
        );
        return;
      }
      if (showDocumentForm) {
        Alert.alert(
          'Upload your document',
          'Choose NIN below, fill the required details, and upload a clear image of your NIN slip or card.'
        );
        return;
      }
      await loadStatus();
    }
  };

  const onSendOtp = async () => {
    setOtpBusy(true);
    try {
      const result = await withUnauthorizedRecovery(signOut, (token) =>
        sendKycPhoneOtp(token)
      );
      setOtpRequested(true);
      setResendSec(RESEND_COOLDOWN_SEC);
      Alert.alert(
        'Code sent',
        result.message || 'Enter the 6-digit code we sent to your phone.'
      );
      void loadStatus(false, { silent: true });
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        return;
      }
      const msg = formatPlizApiErrorForUser(e) || 'Could not send code.';
      Alert.alert('Could not send', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const onResendOtp = async () => {
    if (resendSec > 0) return;
    setOtpBusy(true);
    try {
      const result = await withUnauthorizedRecovery(signOut, (token) =>
        resendKycPhoneOtp(token)
      );
      setOtpRequested(true);
      setResendSec(RESEND_COOLDOWN_SEC);
      Alert.alert('Code sent', result.message || 'A new code is on its way.');
      void loadStatus(false, { silent: true });
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        return;
      }
      const msg = formatPlizApiErrorForUser(e) || 'Could not resend.';
      Alert.alert('Could not resend', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const onVerifyOtp = async () => {
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from SMS.');
      return;
    }
    setOtpBusy(true);
    try {
      await withUnauthorizedRecovery(signOut, (token) => verifyKycPhoneOtp(token, code));
      setOtp('');
      setOtpRequested(false);
      await loadStatus(false, { silent: true });
      await refreshUser();
      Alert.alert('Phone verified', 'You can now verify your identity with your NIN.');
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        return;
      }
      const msg = formatPlizApiErrorForUser(e) || 'Verification failed.';
      Alert.alert('Could not verify', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const onSubmitKyc = async () => {
    if (kycBusy) return;
    setKycBusy(true);
    try {
      const outcome = await withUnauthorizedRecovery(signOut, (token) =>
        submitAndWaitForKycResult(token)
      );
      await loadStatus();
      await refreshUser();
      if (outcome.kind === 'verified') {
        router.replace('/(tabs)/kyc-verification-complete');
        return;
      }
    } catch (e) {
      const msg = formatPlizApiErrorForUser(e) || 'Submission failed.';
      Alert.alert('Could not submit', msg);
    } finally {
      setKycBusy(false);
    }
  };

  return (
    <>
      <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow
        title="Verify Identity"
        backIconColor="#6B7280"
        showNotification={false}
      />

      <View style={styles.content}>
        {loading && !status ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2E8BEA" />
          </View>
        ) : status && ui ? (
          <>
            {!showDocumentForm && !showPhoneSection ? (
              <View style={styles.heroCard}>
                <Text style={styles.heroTitle}>{ui.title}</Text>
                <Text style={styles.heroBody}>{ui.body}</Text>
                <View style={styles.ctaWrap}>
                  <CTAButton
                    label={ui.buttonLabel}
                    onPress={() => void handleUiPrimary()}
                    variant="gradient"
                    accessibilityLabel={ui.buttonLabel}
                  />
                </View>
              </View>
            ) : null}

            {verification?.status === 'rejected' && verification.rejectionReason ? (
              <KycRejectionBanner reason={verification.rejectionReason} />
            ) : null}

            {showPhoneSection ? (
              <View style={styles.phoneSection}>
                <Text style={styles.pageTitle}>Verify your phone</Text>
                <Text style={styles.pageSubtitle}>
                  {status.phoneNumber
                    ? `We will send a 6-digit code to ${maskPhoneNumber(status.phoneNumber)}.`
                    : 'We send a one-time code to the phone number on your profile.'}
                </Text>
                <Text style={styles.pageHint}>
                  If the SMS does not arrive, check your number is correct in Personal Information.
                </Text>

                {verification?.phoneVerified ? (
                  <View style={styles.phoneVerifiedCard}>
                    <View style={styles.phoneVerifiedIcon}>
                      <Ionicons name="checkmark" size={16} color="#16A34A" />
                    </View>
                    <View style={styles.phoneVerifiedCopy}>
                      <Text style={styles.phoneVerifiedTitle}>Phone number verified</Text>
                      <Text style={styles.phoneVerifiedText}>
                        You can continue with NIN verification.
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.ctaStack}>
                  <CTAButton
                    label={otpBusy ? 'Sending…' : 'Send code'}
                    onPress={() => void onSendOtp()}
                    variant="gradient"
                    disabled={otpBusy}
                    accessibilityLabel="Send verification code via SMS"
                  />
                </View>

                <Text style={styles.fieldLabel}>Verification code</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                  editable={!otpBusy}
                />

                <View style={styles.ctaStack}>
                  <CTAButton
                    label={otpBusy ? 'Verifying…' : 'Verify code'}
                    onPress={() => void onVerifyOtp()}
                    variant="gradient"
                    disabled={otpBusy || otp.length !== 6}
                    accessibilityLabel="Verify code"
                  />
                  {otpRequested ? (
                    <CTAButton
                      label={resendSec > 0 ? `Resend code (${resendSec}s)` : 'Resend code'}
                      onPress={() => void onResendOtp()}
                      variant="transparent"
                      disabled={otpBusy || resendSec > 0}
                      accessibilityLabel="Resend code"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}

            {showDocumentForm ? (
              <>
                {verification?.phoneVerified ? (
                  <View style={styles.phoneVerifiedCard}>
                    <View style={styles.phoneVerifiedIcon}>
                      <Ionicons name="checkmark" size={16} color="#16A34A" />
                    </View>
                    <View style={styles.phoneVerifiedCopy}>
                      <Text style={styles.phoneVerifiedTitle}>Phone number verified</Text>
                      <Text style={styles.phoneVerifiedText}>
                        Choose NIN to complete identity verification.
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.methodHeader}>
                  <Text style={styles.methodTitle}>Verify with NIN</Text>
                  <Text style={styles.methodSubtitle}>
                    Verified accounts unlock higher limits and earn trust badges
                  </Text>
                </View>

                <Pressable
                  style={styles.methodCard}
                  onPress={() => router.push('/(tabs)/kyc-nin-verification')}
                  accessibilityRole="button"
                >
                  <View style={[styles.methodIconBox, { backgroundColor: '#A93BC4' }]}>
                    <Ionicons name="id-card-outline" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.methodCopy}>
                    <Text style={styles.methodCardTitle}>National ID (NIN)</Text>
                    <Text style={styles.methodCardBody}>
                      Verify with your 11-digit NIN or Virtual NIN — matched against the national
                      registry
                    </Text>
                    <View style={styles.durationRow}>
                      <Ionicons name="time-outline" size={11} color="#6B7280" />
                      <Text style={styles.durationText}>~ 3 minutes</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#6B7280" />
                </Pressable>

                <View style={styles.securityNotice}>
                  <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                  <Text style={styles.securityNoticeText}>
                    Your documents are encrypted and stored securely. We only use them to verify
                    your identity and never share them with third parties.
                  </Text>
                </View>
              </>
            ) : null}

            {showFinalSubmit ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Submit verification</Text>
                <Text style={styles.actionHint}>
                  We will verify your NIN with the government registry and confirm your name matches
                  your profile.
                </Text>
                <View style={styles.ctaWrap}>
                  <CTAButton
                    label={kycBusy ? 'Verifying…' : 'Submit verification'}
                    onPress={() => void onSubmitKyc()}
                    variant="gradient"
                    disabled={kycBusy}
                    accessibilityLabel="Submit verification"
                  />
                </View>
              </View>
            ) : null}

            {!steps[0]?.completed ? (
              <View style={styles.ctaWrap}>
                <CTAButton
                  label="Complete profile first"
                  onPress={() => router.push('/(tabs)/personal-info')}
                  variant="transparent"
                  accessibilityLabel="Complete profile first"
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
  },
  ctaStack: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  phoneSection: {
    marginBottom: 8,
  },
  phoneVerifiedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    marginBottom: 16,
  },
  phoneVerifiedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneVerifiedCopy: {
    flex: 1,
  },
  phoneVerifiedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  phoneVerifiedText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#15803D',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 8,
  },
  pageHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#98A2B3',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  fieldInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepRowLast: {
    borderBottomWidth: 0,
  },
  stepIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  rejectBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rejectText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  methodHeader: {
    marginBottom: 22,
  },
  methodTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  methodSubtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: '#667085',
  },
  methodList: {
    gap: 18,
    marginBottom: 28,
  },
  methodCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  methodCardSelected: {
    borderColor: '#2E8BEA',
    shadowColor: '#2E8BEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  methodIconBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCopy: {
    flex: 1,
    minWidth: 0,
  },
  methodCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  methodCardBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#667085',
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F2F4F7',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 18,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#667085',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  actionHint: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentSelected: {
    backgroundColor: '#355C7D',
    borderColor: '#355C7D',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
});
