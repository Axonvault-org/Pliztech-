import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useUnreadSupportMessageCount } from '@/hooks/useUnreadSupportMessageCount';

const SUPPORT_MESSAGES_HREF = '/(tabs)/admin-messages' as const;

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

/** Sticky support chat entry — bottom-right above the tab bar. */
export function SupportChatFab() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const { unreadCount } = useUnreadSupportMessageCount();

  if (!user?.id) return null;

  const hasUnread = unreadCount > 0;
  const badgeLabel = hasUnread ? formatBadgeCount(unreadCount) : undefined;
  const bottomOffset = Math.max(insets.bottom, 8) + (Platform.OS === 'web' ? 72 : 68);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: bottomOffset }]}>
      <Pressable
        onPress={() => router.push(SUPPORT_MESSAGES_HREF)}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={
          hasUnread
            ? `Support messages, ${unreadCount} unread`
            : 'Support messages'
        }
      >
        <LinearGradient
          colors={['#14B8A6', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
        </LinearGradient>
        {hasUnread ? (
          <View style={[styles.badge, badgeLabel === '99+' && styles.badgeWide]}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
    elevation: 12,
  },
  pressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  gradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 28,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 13,
  },
});
