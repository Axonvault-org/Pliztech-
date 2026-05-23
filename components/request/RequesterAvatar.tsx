import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

export type RequesterAvatarProps = {
  size?: number;
  initial: string;
  avatarColor: string;
  avatarUrl?: string | null;
  /** When true, show neutral "?" avatar (anonymous requester). */
  maskAvatar?: boolean;
};

/** React Native Image does not reliably render remote SVG (e.g. DiceBear svg). */
export function isRasterAvatarUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const lower = url.trim().toLowerCase();
  if (lower.includes('.svg')) return false;
  if (lower.includes('/svg?')) return false;
  return lower.startsWith('http://') || lower.startsWith('https://');
}

export function RequesterAvatar({
  size = 40,
  initial,
  avatarColor,
  avatarUrl,
  maskAvatar = false,
}: RequesterAvatarProps) {
  const radius = size / 2;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const canShowImage =
    !maskAvatar && isRasterAvatarUrl(avatarUrl) && !imageFailed;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: maskAvatar ? '#9CA3AF' : avatarColor,
        },
      ]}
    >
      {canShowImage ? (
        <Image
          source={{ uri: avatarUrl!.trim() }}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.4) }]}>
          {maskAvatar ? '?' : initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
