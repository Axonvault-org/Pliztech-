import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
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
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getKycStatus,
  resetKycAfterRejection,
  resendKycPhoneOtp,
  sendKycPhoneOtp,
  submitKyc,
  uploadKycDocument,
  verifyKycFaceLiveness,
  verifyKycPhoneOtp,
  type KycVerificationType,
  type KycStatusPayload,
} from '@/lib/api/kyc';
import { PlizApiError } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

const RESEND_COOLDOWN_SEC = 60;

function identityReviewInFlight(
  verification: KycStatusPayload['verification'] | undefined
): boolean {
  if (!verification?.verificationType) return false;
  return verification.status === 'pending' || verification.status === 'under_review';
}

export default function KycVerificationScreen() {
  const { refreshUser, signOut } = useCurrentUser();

  const [status, setStatus] = useState<KycStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [verificationType, setVerificationType] = useState<KycVerificationType>('nin');
  const [nin, setNin] = useState('');
  const [ninDocumentType, setNinDocumentType] = useState<'slip' | 'card'>('slip');
  const [ninStateOfOrigin, setNinStateOfOrigin] = useState('');
  const [ninLGA, setNinLGA] = useState('');
  const [ninEnrollmentDate, setNinEnrollmentDate] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportPlaceOfBirth, setPassportPlaceOfBirth] = useState('');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [passportPlaceOfIssue, setPassportPlaceOfIssue] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);
  const [resendSec, setResendSec] = useState(0);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => {
      setResendSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const loadStatus = useCallback(
    async (retryAfterRefresh = false) => {
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
            await loadStatus(true);
            return;
          }
        }
        const msg = e instanceof PlizApiError ? e.message : 'Could not load verification status.';
        Alert.alert('Error', msg);
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

  const steps = status?.steps ?? [];
  const verification = status?.verification;
  const ui = status?.ui;

  const showPhoneSection = steps[0]?.completed === true && steps[1]?.completed === false;

  const showDocumentForm =
    steps[1]?.completed === true &&
    steps[2]?.completed !== true &&
    !verification?.isVerified &&
    !identityReviewInFlight(verification) &&
    (verification?.status !== 'rejected' || verification?.canRetry === true);

  const showFaceLiveness =
    steps[2]?.completed === true &&
    steps[3]?.completed !== true &&
    !verification?.isVerified &&
    !identityReviewInFlight(verification);

  const showFinalSubmit =
    steps[3]?.completed === true &&
    !verification?.isVerified &&
    !identityReviewInFlight(verification);

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
      router.push('/(tabs)/(main)/create');
      return;
    }

    if (url === '/kyc/update') {
      const token = await getAccessToken();
      if (!token) return;
      setKycBusy(true);
      try {
        await resetKycAfterRejection(token);
        await loadStatus();
      } catch (e) {
        const msg = e instanceof PlizApiError ? e.message : 'Could not restart verification.';
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
          'Choose NIN or international passport below, fill the required details, and upload a clear image.'
        );
        return;
      }
      await loadStatus();
    }
  };

  const onSendOtp = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setOtpBusy(true);
    try {
      await sendKycPhoneOtp(token);
      setResendSec(RESEND_COOLDOWN_SEC);
      Alert.alert('Code sent', 'Enter the 6-digit code we sent to your phone.');
      await loadStatus();
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Could not send code.';
      Alert.alert('Could not send', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const onResendOtp = async () => {
    if (resendSec > 0) return;
    const token = await getAccessToken();
    if (!token) return;
    setOtpBusy(true);
    try {
      await resendKycPhoneOtp(token);
      setResendSec(RESEND_COOLDOWN_SEC);
      Alert.alert('Code sent', 'A new code is on its way.');
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Could not resend.';
      Alert.alert('Could not resend', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const onVerifyOtp = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from SMS.');
      return;
    }
    setOtpBusy(true);
    try {
      await verifyKycPhoneOtp(token, code);
      setOtp('');
      await loadStatus();
      await refreshUser();
      Alert.alert('Phone verified', 'You can now verify your identity with NIN or international passport.');
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Verification failed.';
      Alert.alert('Could not verify', msg);
    } finally {
      setOtpBusy(false);
    }
  };

  const pickImageFile = async (): Promise<{ uri: string; name: string; type: string } | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access so you can upload your document.');
      return null;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets[0]) return null;
    const asset = picked.assets[0];
    const lower = asset.uri.toLowerCase();
    const type =
      asset.mimeType ??
      (lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    return {
      uri: asset.uri,
      name: asset.fileName ?? `kyc-${Date.now()}.jpg`,
      type,
    };
  };

  const onUploadDocument = async (documentType?: 'nin_front' | 'nin_back' | 'passport_biodata') => {
    const token = await getAccessToken();
    if (!token) return;

    const file = await pickImageFile();
    if (!file) return;

    setKycBusy(true);
    try {
      if (verificationType === 'nin') {
        const digits = nin.replace(/\D/g, '');
        if (digits.length !== 11) {
          Alert.alert('Invalid NIN', 'NIN must be exactly 11 digits.');
          return;
        }
        if (!ninStateOfOrigin.trim() || !ninLGA.trim() || !ninEnrollmentDate.trim()) {
          Alert.alert('Missing details', 'Enter state of origin, LGA, and enrollment date.');
          return;
        }
        await uploadKycDocument(token, {
          verificationType: 'nin',
          documentType: documentType === 'nin_back' ? 'nin_back' : 'nin_front',
          file,
          nin: digits,
          ninDocumentType,
          ninStateOfOrigin,
          ninLGA,
          ninEnrollmentDate,
        });
      } else {
        if (
          !passportNumber.trim() ||
          !passportPlaceOfBirth.trim() ||
          !passportIssueDate.trim() ||
          !passportExpiry.trim() ||
          !passportPlaceOfIssue.trim()
        ) {
          Alert.alert('Missing details', 'Complete all passport fields before uploading.');
          return;
        }
        await uploadKycDocument(token, {
          verificationType: 'passport',
          documentType: 'passport_biodata',
          file,
          passportNumber,
          passportPlaceOfBirth,
          passportIssueDate,
          passportExpiry,
          passportPlaceOfIssue,
        });
      }
      await loadStatus();
      await refreshUser();
      Alert.alert('Document uploaded', 'Next, complete face liveness when prompted.');
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Upload failed.';
      Alert.alert('Could not upload', msg);
    } finally {
      setKycBusy(false);
    }
  };

  const onFaceLiveness = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const file = await pickImageFile();
    if (!file) return;
    setKycBusy(true);
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error('Could not read selfie image.'));
        reader.onloadend = () => {
          const result = String(reader.result ?? '');
          resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
        };
        reader.readAsDataURL(blob);
      });
      await verifyKycFaceLiveness(token, imageBase64);
      await loadStatus();
      Alert.alert('Selfie confirmed', 'You can now submit your verification for review.');
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Face liveness failed.';
      Alert.alert('Could not verify selfie', msg);
    } finally {
      setKycBusy(false);
    }
  };

  const onSubmitKyc = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setKycBusy(true);
    try {
      await submitKyc(token);
      await loadStatus();
      await refreshUser();
      Alert.alert('Submitted', 'We are verifying your details. You will be notified shortly.');
    } catch (e) {
      const msg = e instanceof PlizApiError ? e.message : 'Submission failed.';
      Alert.alert('Could not submit', msg);
    } finally {
      setKycBusy(false);
    }
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Account Verification" backIconColor="#9CA3AF" />

      <View style={styles.content}>
        {loading && !status ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#EA580C" />
          </View>
        ) : status && ui ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{ui.title}</Text>
              <Text style={styles.heroBody}>{ui.body}</Text>
              <Pressable
                style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
                onPress={() => void handleUiPrimary()}
              >
                <Text style={styles.heroButtonText}>{ui.buttonLabel}</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Progress</Text>
            <View style={styles.stepsCard}>
              {steps.map((s, i) => (
                <View
                  key={s.step}
                  style={[styles.stepRow, i === steps.length - 1 && styles.stepRowLast]}
                >
                  <View style={styles.stepIcon}>
                    <Ionicons
                      name={s.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={s.completed ? '#22C55E' : '#D1D5DB'}
                    />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepLabel}>{s.label}</Text>
                    <Text style={styles.stepDesc}>{s.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {verification?.status === 'rejected' && verification.rejectionReason ? (
              <View style={styles.rejectBanner}>
                <Ionicons name="alert-circle-outline" size={20} color="#B45309" />
                <Text style={styles.rejectText}>{verification.rejectionReason}</Text>
              </View>
            ) : null}

            {showPhoneSection ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Phone number</Text>
                <Text style={styles.actionHint}>
                  We send a one-time code to the number on your profile.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                  onPress={() => void onSendOtp()}
                  disabled={otpBusy}
                >
                  {otpBusy ? (
                    <ActivityIndicator color="#EA580C" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Send verification code</Text>
                  )}
                </Pressable>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                />
                <View style={styles.otpActions}>
                  <Pressable
                    style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
                    onPress={() => void onVerifyOtp()}
                    disabled={otpBusy}
                  >
                    <Text style={styles.linkBtnText}>Verify code</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.linkBtn,
                      resendSec > 0 && styles.linkDisabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void onResendOtp()}
                    disabled={otpBusy || resendSec > 0}
                  >
                    <Text style={styles.linkBtnText}>
                      {resendSec > 0 ? `Resend (${resendSec}s)` : 'Resend code'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {showDocumentForm ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Means of verification</Text>
                <Text style={styles.actionHint}>
                  Choose NIN or international passport, then upload a clear image of the document.
                </Text>
                <View style={styles.segmentRow}>
                  {(['nin', 'passport'] as const).map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.segment,
                        verificationType === type && styles.segmentSelected,
                      ]}
                      onPress={() => setVerificationType(type)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          verificationType === type && styles.segmentTextSelected,
                        ]}
                      >
                        {type === 'nin' ? 'NIN' : "Int'l passport"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {verificationType === 'nin' ? (
                  <>
                    <View style={styles.segmentRow}>
                      {(['slip', 'card'] as const).map((type) => (
                        <Pressable
                          key={type}
                          style={[
                            styles.segment,
                            ninDocumentType === type && styles.segmentSelected,
                          ]}
                          onPress={() => setNinDocumentType(type)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              ninDocumentType === type && styles.segmentTextSelected,
                            ]}
                          >
                            {type === 'slip' ? 'NIN slip' : 'NIN card'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="11-digit NIN"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={11}
                      value={nin}
                      onChangeText={(t) => setNin(t.replace(/\D/g, ''))}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="State of origin"
                      placeholderTextColor="#9CA3AF"
                      value={ninStateOfOrigin}
                      onChangeText={setNinStateOfOrigin}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="LGA"
                      placeholderTextColor="#9CA3AF"
                      value={ninLGA}
                      onChangeText={setNinLGA}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enrollment date (YYYY-MM-DD)"
                      placeholderTextColor="#9CA3AF"
                      value={ninEnrollmentDate}
                      onChangeText={setNinEnrollmentDate}
                    />
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Passport number (A12345678)"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      value={passportNumber}
                      onChangeText={setPassportNumber}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Place of birth"
                      placeholderTextColor="#9CA3AF"
                      value={passportPlaceOfBirth}
                      onChangeText={setPassportPlaceOfBirth}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Issue date (YYYY-MM-DD)"
                      placeholderTextColor="#9CA3AF"
                      value={passportIssueDate}
                      onChangeText={setPassportIssueDate}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Expiry date (YYYY-MM-DD)"
                      placeholderTextColor="#9CA3AF"
                      value={passportExpiry}
                      onChangeText={setPassportExpiry}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Place of issue"
                      placeholderTextColor="#9CA3AF"
                      value={passportPlaceOfIssue}
                      onChangeText={setPassportPlaceOfIssue}
                    />
                  </>
                )}

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  onPress={() => void onUploadDocument(verificationType === 'passport' ? 'passport_biodata' : 'nin_front')}
                  disabled={kycBusy}
                >
                  {kycBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {verificationType === 'passport' ? 'Upload passport page' : 'Upload front document'}
                    </Text>
                  )}
                </Pressable>
                {verificationType === 'nin' && ninDocumentType === 'card' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      styles.secondaryBtnTop,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void onUploadDocument('nin_back')}
                    disabled={kycBusy}
                  >
                    <Text style={styles.secondaryBtnText}>Upload back of NIN card</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {showFaceLiveness ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Face liveness</Text>
                <Text style={styles.actionHint}>
                  Upload a clear selfie so we can confirm that the document belongs to you.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  onPress={() => void onFaceLiveness()}
                  disabled={kycBusy}
                >
                  {kycBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Upload selfie</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {showFinalSubmit ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Submit verification</Text>
                <Text style={styles.actionHint}>
                  Send your verified document and selfie for final identity checks.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  onPress={() => void onSubmitKyc()}
                  disabled={kycBusy}
                >
                  {kycBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit verification</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {!steps[0]?.completed ? (
              <Pressable
                style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
                onPress={() => router.push('/(tabs)/personal-info')}
              >
                <Text style={styles.outlineBtnText}>Complete profile first</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
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
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
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
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    backgroundColor: '#FFFBF0',
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EA580C',
  },
  secondaryBtnTop: {
    marginTop: 10,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkBtn: {
    paddingVertical: 8,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EA580C',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});
