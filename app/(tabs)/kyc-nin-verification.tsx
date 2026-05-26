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
import { uploadKycDocument } from '@/lib/api/kyc';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import { type PickedKycFile } from '@/lib/kyc/helpers';
import { submitAndWaitForKycResult, ensureKycReadyForResubmit } from '@/lib/kyc/submit-flow';

type NinDocumentType = 'slip' | 'card';

function isValidNinOrVnin(value: string): boolean {
  const trimmed = value.trim();
  if (/^\d{11}$/.test(trimmed.replace(/\D/g, ''))) return true;
  return /^[A-Za-z0-9]{16}$/.test(trimmed.replace(/\s/g, ''));
}

function getSubmitBlockReason({
  nin,
  ninDocumentType,
  frontFile,
  backFile,
  profileNameReady,
  picking,
}: {
  nin: string;
  ninDocumentType: NinDocumentType;
  frontFile: PickedKycFile | null;
  backFile: PickedKycFile | null;
  profileNameReady: boolean;
  picking: boolean;
}): string | null {
  if (picking) return 'Finish choosing your document photo first.';
  if (!profileNameReady) {
    return 'Add your legal first and last name in your profile before continuing.';
  }
  if (!isValidNinOrVnin(nin)) {
    return 'Enter your 11-digit NIN or 16-character Virtual NIN (vNIN) from the NIMC app.';
  }
  if (!frontFile) {
    return ninDocumentType === 'card'
      ? 'Upload a photo of the front of your NIN card.'
      : 'Upload a photo of your NIN slip.';
  }
  if (ninDocumentType === 'card' && !backFile) {
    return 'Upload a photo of the back of your NIN card.';
  }
  return null;
}

export default function KycNinVerificationScreen() {
  const { user, refreshUser, signOut } = useCurrentUser();
  const { pickDocument, modal: imagePickerModal, picking } = useKycImagePicker();
  const [nin, setNin] = useState('');
  const [ninDocumentType, setNinDocumentType] = useState<NinDocumentType>('card');
  const [frontFile, setFrontFile] = useState<PickedKycFile | null>(null);
  const [backFile, setBackFile] = useState<PickedKycFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Submit verification');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const profileNameReady = Boolean(
    user?.profile?.firstName?.trim() && user?.profile?.lastName?.trim()
  );

  const submitBlockReason = getSubmitBlockReason({
    nin,
    ninDocumentType,
    frontFile,
    backFile,
    profileNameReady,
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
    if (!frontFile) return;

    setRejectionReason(null);
    setSubmitting(true);
    setSubmitLabel('Uploading document…');
    try {
      const profileState = user?.profile?.state?.trim();
      const profileCity = user?.profile?.city?.trim();

      await withUnauthorizedRecovery(signOut, async (token) => {
        await ensureKycReadyForResubmit(token);

        await uploadKycDocument(token, {
          verificationType: 'nin',
          documentType: 'nin_front',
          file: frontFile,
          nin,
          ninDocumentType,
          ninStateOfOrigin: profileState || undefined,
          ninLGA: profileCity || undefined,
        });

        if (ninDocumentType === 'card' && backFile) {
          await uploadKycDocument(token, {
            verificationType: 'nin',
            documentType: 'nin_back',
            file: backFile,
            nin,
            ninDocumentType,
            ninStateOfOrigin: profileState || undefined,
            ninLGA: profileCity || undefined,
          });
        }
      });

      setSubmitLabel('Verifying with NIN registry…');
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
          <Text style={styles.title}>National ID (NIN)</Text>
          <Text style={styles.subtitle}>
            Enter your 11-digit NIN or Virtual NIN (vNIN) from the NIMC app, then upload a clear
            photo of your document. Identity is verified against the national registry.
          </Text>

          <ProfileNameNotice documentLabel="NIN" />

          {rejectionReason ? <KycRejectionBanner reason={rejectionReason} /> : null}

          <Text style={styles.label}>NIN or Virtual NIN (vNIN)</Text>
          <TextInput
            style={styles.input}
            placeholder="11-digit NIN or 16-character vNIN"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            value={nin}
            onChangeText={(value) => setNin(value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          />
          <Text style={styles.sectionHint}>
            Generate vNIN in the NIMC app using enterprise code 696739, or use your 11-digit NIN.
          </Text>

          <Text style={styles.label}>Document type</Text>
          <View style={styles.segmentRow}>
            {(['card', 'slip'] as const).map((type) => {
              const selected = ninDocumentType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  onPress={() => {
                    setNinDocumentType(type);
                    if (type === 'slip') setBackFile(null);
                  }}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                    {type === 'card' ? 'NIN card' : 'NIN slip'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Document photo</Text>
          <Text style={styles.sectionHint}>
            {ninDocumentType === 'card'
              ? 'Upload clear photos of the front and back of your NIN card.'
              : 'Upload a clear photo of your NIN slip.'}
          </Text>

          <UploadBox
            title={ninDocumentType === 'card' ? 'Upload front of document' : 'Upload NIN slip'}
            subtitle={frontFile ? frontFile.name : 'Tap to take a photo or choose from gallery'}
            selected={frontFile != null}
            disabled={picking}
            onPress={() => void pickDocument('nin-front').then(setFrontFile)}
          />

          {ninDocumentType === 'card' ? (
            <UploadBox
              title="Upload back of document"
              subtitle={backFile ? backFile.name : 'Required for NIN card'}
              selected={backFile != null}
              disabled={picking}
              onPress={() => void pickDocument('nin-back').then(setBackFile)}
            />
          ) : null}

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
  formHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B45309',
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentSelected: {
    backgroundColor: '#2E8BEA',
    borderColor: '#2E8BEA',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
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
    minHeight: 168,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#64748B',
    borderRadius: 18,
    marginBottom: 16,
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
    marginTop: 8,
    alignItems: 'center',
  },
});
