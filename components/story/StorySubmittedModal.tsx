import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

type StorySubmittedModalProps = {
  visible: boolean;
  message?: string;
  onDone: () => void;
  onViewStories: () => void;
};

export function StorySubmittedModal({
  visible,
  message,
  onDone,
  onViewStories,
}: StorySubmittedModalProps) {
  const body =
    message?.trim() ||
    'Your story has been submitted and will appear after review.';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={42} color="#059669" />
          </View>
          <Text style={styles.title}>Story submitted</Text>
          <Text style={styles.body}>{body}</Text>

          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={onViewStories}
            accessibilityRole="button"
            accessibilityLabel="View community stories"
          >
            <Text style={styles.primaryText}>View stories</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 22,
  },
  primary: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#2E8BEA',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E8BEA',
  },
  pressed: {
    opacity: 0.82,
  },
});
