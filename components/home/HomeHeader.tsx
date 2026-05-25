import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProfilePictureViewerModal } from '@/components/profile/ProfilePictureViewerModal';
import { isRasterAvatarUrl } from '@/components/request/RequesterAvatar';
import { Text } from '@/components/Text';

import { HeaderNotificationButton } from '@/components/home/HeaderNotificationButton';

const COLORS = {
  heading: '#1F2937',
  avatarBg: '#374151',
  pillBg: '#2E8BEA',
} as const;

export interface HomeHeaderProps {
  firstName: string;
  role: string;
  onNotificationPress?: () => void;
  /** When &gt; 0, shows a badge on the bell (e.g. unread API count). */
  unreadNotificationCount?: number;
  avatarColor?: string;
  avatarUrl?: string | null;
  initials?: string;
  maskAvatar?: boolean;
  /** Tap avatar photo to open full-screen preview */
  previewPhoto?: boolean;
}

export function HomeHeader({
  firstName,
  role,
  onNotificationPress,
  unreadNotificationCount = 0,
  avatarColor = COLORS.avatarBg,
  avatarUrl,
  initials,
  maskAvatar = false,
  previewPhoto = true,
}: HomeHeaderProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const avatarLabel =
    maskAvatar ? '?' : initials?.trim() || firstName.charAt(0).toUpperCase() || '?';
  const isBeginnerBadge = role === 'Beginner';
  const canShowImage =
    !maskAvatar && isRasterAvatarUrl(avatarUrl) && !imageFailed;
  const canPreview = previewPhoto && canShowImage;
  const displayName = firstName.trim() || 'You';

  const avatarBody = (
    <View
      style={[
        styles.avatar,
        { backgroundColor: maskAvatar ? '#9CA3AF' : avatarColor },
      ]}
    >
      {canShowImage ? (
        <Image
          source={{ uri: avatarUrl!.trim() }}
          style={styles.avatarImage}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={styles.avatarText}>{avatarLabel}</Text>
      )}
    </View>
  );

  return (
    <>
    <View style={styles.row}>
      <View style={styles.left}>
        {canPreview ? (
          <Pressable
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="View your profile photo"
            style={({ pressed }) => [pressed && styles.avatarPressed]}
          >
            {avatarBody}
          </Pressable>
        ) : (
          avatarBody
        )}
        <Text style={styles.greeting}>
          Hi, <Text style={styles.name}>{firstName}</Text>
        </Text>
      </View>
      <View style={[styles.pill, isBeginnerBadge && styles.pillBeginner]}>
        <Ionicons
          name={isBeginnerBadge ? 'school-outline' : 'heart'}
          size={12}
          color={isBeginnerBadge ? '#92400E' : '#FFFFFF'}
          style={styles.pillIcon}
        />
        <Text
          style={[styles.pillText, isBeginnerBadge && styles.pillTextBeginner]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {role}
        </Text>
      </View>
      <HeaderNotificationButton
        onPress={onNotificationPress ?? (() => {})}
        unreadCount={unreadNotificationCount}
      />
    </View>

    <ProfilePictureViewerModal
      visible={previewOpen}
      imageUrl={canPreview ? avatarUrl ?? null : null}
      title={displayName}
      onClose={() => setPreviewOpen(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPressed: {
    opacity: 0.88,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greeting: {
    fontSize: 16,
    color: COLORS.heading,
  },
  name: {
    fontWeight: '700',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    maxWidth: 120,
  },
  pillBeginner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  pillTextBeginner: {
    color: '#92400E',
  },
});
