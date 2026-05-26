import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { KycRejectionBanner } from '@/components/kyc/KycRejectionBanner';
import { ProfileNameNotice } from '@/components/kyc/ProfileNameNotice';
import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useKycImagePicker } from '@/hooks/useKycImagePicker';
import { uploadKycDocument, verifyKycFaceLiveness } from '@/lib/api/kyc';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import {
  isFutureOrTodayIsoDate,
  isPastOrTodayIsoDate,
  isValidIsoDate,
  kycImageToBase64,
  PASSPORT_NUMBER_REGEX,
  type PickedKycFile,
} from '@/lib/kyc/helpers';
import { submitAndWaitForKycResult, ensureKycReadyForResubmit } from '@/lib/kyc/submit-flow';
import { KYC_REQUIRE_FACE_LIVENESS } from '@/constants/kyc-config';

function getSubmitBlockReason({
  passportFormatValid,
  issueDateValid,
  expiryDateValid,
  documentFile,
  profileNameReady,
  profileLocation,
  picking,
}: {
  passportFormatValid: boolean;
  issueDateValid: boolean;
  expiryDateValid: boolean;
  documentFile: PickedKycFile | null;
  profileNameReady: boolean;
  profileLocation: string;
  picking: boolean;
}): string | null {
  if (picking) return 'Finish choosing your document photo first.';
  if (!profileNameReady) {
    return 'Add your legal first and last name in your profile before continuing.';
  }
  if (!profileLocation) {
    return 'Add your city or state in your profile before continuing.';
  }
  if (!passportFormatValid) return 'Enter a valid passport number (e.g. A12345678).';
  if (!issueDateValid) return 'Enter a valid issue date (YYYY-MM-DD, not in the future).';
  if (!expiryDateValid) return 'Enter a valid expiry date (YYYY-MM-DD, not expired).';
  if (!documentFile) return 'Upload a photo of your passport biodata page.';
  return null;
}

export default function KycPassportVerificationScreen() {
  const { user, refreshUser, signOut } = useCurrentUser();
  const { pickDocument, pickSelfie, modal: imagePickerModal, picking } = useKycImagePicker();
  const [passportNumber, setPassportNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [documentFile, setDocumentFile] = useState<PickedKycFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Submit verification');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const normalizedPassport = passportNumber.trim().toUpperCase();
  const profileLocation =
    user?.profile?.city?.trim() || user?.profile?.state?.trim() || '';
  const profileNameReady = Boolean(
    user?.profile?.firstName?.trim() && user?.profile?.lastName?.trim()
  );

  const passportFormatValid = PASSPORT_NUMBER_REGEX.test(normalizedPassport);
  const issueDateValid =
    isValidIsoDate(issueDate) && isPastOrTodayIsoDate(issueDate);
  const expiryDateValid =
    isValidIsoDate(expiryDate) && isFutureOrTodayIsoDate(expiryDate);

  const submitBlockReason = getSubmitBlockReason({
    passportFormatValid,
    issueDateValid,
    expiryDateValid,
    documentFile,
    profileNameReady,
    profileLocation,
    picking,
  });
  const formReady = submitBlockReason == null;
  const busy = submitting || picking;

  const onSubmit = async () => {
    if (busy) return;

    if (submitBlockReason) {
      Alert.alert('Complete the form', submitBlockReason);
      return;
    }
    if (!documentFile) return;

    setRejectionReason(null);
    setSubmitting(true);
    setSubmitLabel('Uploading document…');
    try {
      await withUnauthorizedRecovery(signOut, async (token) => {
        await ensureKycReadyForResubmit(token);

        await uploadKycDocument(token, {
          verificationType: 'passport',
          documentType: 'passport_biodata',
          file: documentFile,
          passportNumber: normalizedPassport,
          passportPlaceOfBirth: profileLocation,
          passportIssueDate: issueDate.trim(),
          passportExpiry: expiryDate.trim(),
          passportPlaceOfIssue: profileLocation,
        });
      });

      if (KYC_REQUIRE_FACE_LIVENESS) {
        setSubmitLabel('Take a selfie…');
        const selfieFile = await pickSelfie();
        if (!selfieFile) {
          setSubmitting(false);
          setSubmitLabel('Submit verification');
          return;
        }

        setSubmitLabel('Confirming selfie…');
        const imageBase64 = await kycImageToBase64(selfieFile);
        await withUnauthorizedRecovery(signOut, (token) =>
          verifyKycFaceLiveness(token, imageBase64)
        );
      }

      setSubmitLabel('Verifying with passport registry…');
      const outcome = await withUnauthorizedRecovery(signOut, (token) =>
        submitAndWaitForKycResult(token)
      );

      await refreshUser();

      if (outcome.kind === 'verified') {
        router.replace('/(tabs)/kyc-verification-complete');
        return;
      }

      setRejectionReason(outcome.reason);
    } catch (e) {
      const msg = formatPlizApiErrorForUser(e) || 'Verification failed.';
      Alert.alert('Could not verify', msg);
    } finally {
      setSubmitting(false);
      setSubmitLabel('Submit verification');
    }
  };

  return (
    <>
      <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Verify Identity" backIconColor="#6B7280" showNotification={false} />

      <View style={styles.content}>
        <Text style={styles.title}>International Passport</Text>
        <Text style={styles.subtitle}>
          Enter your passport details and upload the biodata page.
          {KYC_REQUIRE_FACE_LIVENESS
            ? ' We will verify your passport and match your selfie to your passport photo.'
            : ' We will verify your passport details with the registry.'}
        </Text>

        <ProfileNameNotice documentLabel="passport" />

        {rejectionReason ? <KycRejectionBanner reason={rejectionReason} /> : null}

        <Text style={styles.label}>Passport number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. A12345678"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          value={passportNumber}
          onChangeText={(value) => setPassportNumber(value.replace(/\s/g, '').toUpperCase())}
        />
        {passportNumber.length > 0 && !passportFormatValid ? (
          <Text style={styles.fieldError}>Use format A12345678 (one letter + eight digits).</Text>
        ) : null}

        <Text style={styles.label}>Issue date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          value={issueDate}
          onChangeText={setIssueDate}
        />
        {issueDate.length > 0 && !issueDateValid ? (
          <Text style={styles.fieldError}>Use YYYY-MM-DD and a date that is not in the future.</Text>
        ) : null}

        <Text style={styles.label}>Expiry date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          value={expiryDate}
          onChangeText={setExpiryDate}
        />
        {expiryDate.length > 0 && !expiryDateValid ? (
          <Text style={styles.fieldError}>Use YYYY-MM-DD and a date that has not passed.</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Passport biodata page</Text>
        <Text style={styles.sectionHint}>
          Upload a clear photo of the page with your photo, name, and passport number.
        </Text>

        <UploadBox
          title="Upload biodata page"
          subtitle={documentFile ? documentFile.name : 'Tap to take a photo or choose from gallery'}
          selected={documentFile != null}
          disabled={picking}
          onPress={() => void pickDocument('passport').then(setDocumentFile)}
        />

        {!formReady && submitBlockReason ? (
          <Text style={styles.formHint}>{submitBlockReason}</Text>
        ) : null}

        <View style={styles.ctaWrap}>
          <CTAButton
            label={submitLabel}
            onPress={() => void onSubmit()}
            variant="gradient"
            disabled={busy}
            accessibilityLabel="Submit verification"
          />
        </View>
      </View>
    </Screen>
    {imagePickerModal}
    </>
  );
}

function UploadBox({
  title,
  subtitle,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.uploadBox,
        selected && styles.uploadBoxSelected,
        disabled && styles.uploadBoxDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <View style={styles.uploadBoxInner} pointerEvents="none">
        <View style={styles.cameraIconBox}>
          <Ionicons name={selected ? 'checkmark' : 'camera-outline'} size={24} color="#64748B" />
        </View>
        <Text style={styles.uploadTitle}>{title}</Text>
        <Text style={styles.uploadSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  input: {
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
  fieldError: {
    fontSize: 13,
    color: '#B45309',
    marginTop: -10,
    marginBottom: 16,
  },
  formHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B45309',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 16,
  },
  uploadBox: {
    minHeight: 180,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#64748B',
    borderRadius: 18,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  uploadBoxSelected: {
    borderColor: '#2E8BEA',
    backgroundColor: '#F8FBFF',
  },
  uploadBoxDisabled: {
    opacity: 0.6,
  },
  uploadBoxInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  pressed: {
    opacity: 0.88,
  },
  cameraIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667085',
    textAlign: 'center',
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
  },
});
