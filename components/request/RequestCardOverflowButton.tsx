import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

type RequestCardOverflowButtonProps = {
  onPress: () => void;
};

export function RequestCardOverflowButton({ onPress }: RequestCardOverflowButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityLabel="More options"
      accessibilityRole="button"
      hitSlop={8}
    >
      <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  buttonPressed: {
    backgroundColor: '#F3F4F6',
  },
});
