import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

export type PermissionRationaleKind = 'camera' | 'photos';

type PermissionRationaleProps = {
  visible: boolean;
  kind: PermissionRationaleKind;
  onContinue: () => void;
  onCancel: () => void;
};

const COPY: Record<
  PermissionRationaleKind,
  { title: string; body: string; continueLabel: string }
> = {
  camera: {
    title: 'Camera access',
    body: 'Plz uses your camera to take profile photos, verify your identity (KYC), and attach optional request evidence. Photos are uploaded securely and reviewed only for safety and verification.',
    continueLabel: 'Continue',
  },
  photos: {
    title: 'Photo library access',
    body: 'Plz uses your photo library so you can choose a profile picture, upload identity documents for verification, and attach optional evidence to a request.',
    continueLabel: 'Continue',
  },
};

export function PermissionRationale({
  visible,
  kind,
  onContinue,
  onCancel,
}: PermissionRationaleProps) {
  const copy = COPY[kind];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              <Text style={styles.cancelLabel}>Not now</Text>
            </Pressable>
            <Pressable
              style={styles.continueButton}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel={copy.continueLabel}
            >
              <Text style={styles.continueLabel}>{copy.continueLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2E8BEA',
  },
  continueLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
