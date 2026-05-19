import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

type KycImageSourceModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onCamera: () => void;
  onGallery: () => void;
  onCancel: () => void;
};

export function KycImageSourceModal({
  visible,
  title,
  message,
  onCamera,
  onGallery,
  onCancel,
}: KycImageSourceModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            onPress={onCamera}
          >
            <Text style={styles.optionText}>Take photo</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            onPress={onGallery}
          >
            <Text style={styles.optionText}>Choose from gallery</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 8,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.85,
  },
});
