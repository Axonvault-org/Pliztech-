import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';

export type ProfilePictureViewerModalProps = {
  visible: boolean;
  imageUrl: string | null;
  /** Shown under the photo, e.g. member name */
  title?: string;
  onClose: () => void;
};

export function ProfilePictureViewerModal({
  visible,
  imageUrl,
  title,
  onClose,
}: ProfilePictureViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const frameSize = Math.min(screenWidth - 48, screenHeight * 0.55, 400);

  if (!imageUrl?.trim()) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close photo preview"
          accessibilityRole="button"
        />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body} pointerEvents="box-none">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.photoFrame, { width: frameSize, height: frameSize }]}
            accessibilityRole="image"
            accessibilityLabel={title ? `${title} profile photo` : 'Profile photo'}
          >
            <Image
              source={{ uri: imageUrl.trim() }}
              style={styles.photo}
              contentFit="contain"
              transition={200}
            />
          </Pressable>
          {title ? (
            <Text style={[styles.title, { maxWidth: frameSize + 40 }]} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  photoFrame: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  title: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
