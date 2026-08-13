import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

const BRAND_BLUE = '#2E8BEA';

export type HeaderNotificationButtonProps = {
  onPress: () => void;
  /** Unread inbox count from GET /api/notifications/unread-count */
  unreadCount?: number;
};

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

/**
 * Notification entry control used on the home header — reuse on other screens for a consistent bell.
 */
export function HeaderNotificationButton({
  onPress,
  unreadCount = 0,
}: HeaderNotificationButtonProps) {
  const hasUnread = unreadCount > 0;
  const badgeLabel = hasUnread ? formatBadgeCount(unreadCount) : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      accessibilityLabel={
        hasUnread
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
      accessibilityRole="button"
    >
      <View style={styles.circle}>
        <Ionicons name="notifications-outline" size={22} color={BRAND_BLUE} />
        {hasUnread ? (
          <View style={[styles.badge, badgeLabel === '99+' && styles.badgeWide]}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 4,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 24,
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },
});
