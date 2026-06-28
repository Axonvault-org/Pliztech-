import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  formatBegExpiresLabel,
  extendBeg,
  getExpiringBegs,
  getMyBegs,
  type BegExpiryHours,
  type BegFeedItem,
  type ExpiringBegApi,
} from '@/lib/api/beg';
import {
  getNotifications,
  isSupportMessagesNotificationType,
  mapApiNotificationToListItem,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListItem,
} from '@/lib/api/notifications';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { navigateToBegDetailOrPastOverlay } from '@/lib/navigation/post-donation-navigation';

const ACCENT_BLUE = '#2E8BEA';

const ICON_MAP: Record<NotificationListItem['icon'], keyof typeof Ionicons.glyphMap> = {
  heart: 'heart-outline',
  'checkmark-circle': 'checkmark-circle-outline',
  chatbubble: 'chatbubble-outline',
  megaphone: 'megaphone-outline',
  time: 'time-outline',
  'alert-circle': 'alert-circle-outline',
  gift: 'gift-outline',
};

function ExpiringBegAlertCard({
  beg,
  onExtend,
}: {
  beg: ExpiringBegApi;
  onExtend: () => void;
}) {
  const ends = formatBegExpiresLabel(beg.expiresAt);
  const preview = (beg.description ?? 'Your request').trim().slice(0, 72);
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertIconWrap}>
        <Ionicons name="hourglass-outline" size={22} color="#EA580C" />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>Ending soon</Text>
        <Text style={styles.alertBody} numberOfLines={2}>
          {preview}
          {beg.description && beg.description.length > 72 ? '…' : ''}
        </Text>
        <Text style={styles.alertMeta}>{ends === 'Expired' ? 'Expired' : `Time left: ${ends}`}</Text>
        <Pressable
          style={styles.extendBtn}
          onPress={onExtend}
          accessibilityRole="button"
          accessibilityLabel="Extend request"
        >
          <Text style={styles.extendBtnLabel}>Extend</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExpiredBegNoticeCard({ beg }: { beg: BegFeedItem }) {
  const preview = (beg.description ?? 'Your request').trim().slice(0, 72);
  return (
    <Pressable
      style={styles.expiredCard}
      onPress={() => void navigateToBegDetailOrPastOverlay(beg.id)}
      accessibilityRole="button"
    >
      <View style={styles.alertIconWrapMuted}>
        <Ionicons name="time-outline" size={22} color="#9CA3AF" />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.expiredTitle}>Request expired</Text>
        <Text style={styles.alertBody} numberOfLines={2}>
          {preview}
          {beg.description && beg.description.length > 72 ? '…' : ''}
        </Text>
        <Text style={styles.alertMeta}>It is no longer visible in the feed. Tap to view.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationListItem;
  onPress?: () => void;
}) {
  const iconName = ICON_MAP[item.icon];
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}20` }]}>
        <Ionicons name={iconName} size={24} color={item.iconColor} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, item.unread && styles.titleUnread]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      {item.unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { signOut } = useCurrentUser();
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expiringBegs, setExpiringBegs] = useState<ExpiringBegApi[]>([]);
  const [expiredBegs, setExpiredBegs] = useState<BegFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (opts?: { background?: boolean; _retryAfterRefresh?: boolean }) => {
      const background = opts?.background ?? false;
      const retryAfterRefresh = opts?._retryAfterRefresh ?? false;
      if (!background) {
        setLoading(true);
      }
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setItems([]);
          setUnreadCount(0);
          setExpiringBegs([]);
          setExpiredBegs([]);
          return;
        }

        const [result, expiring, myBegsRes] = await Promise.all([
          getNotifications(token, { page: 1, limit: 50 }),
          getExpiringBegs(token).catch(() => [] as ExpiringBegApi[]),
          getMyBegs(token, { page: 1, limit: 100 }).catch(() => ({ begs: [] as BegFeedItem[] })),
        ]);

        setItems(result.notifications.map(mapApiNotificationToListItem));
        setUnreadCount(result.unreadCount);
        setExpiringBegs(expiring);
        const expired = myBegsRes.begs
          .filter((b) => b.status === 'expired')
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 8);
        setExpiredBegs(expired);
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadNotifications({ background, _retryAfterRefresh: true });
            return;
          }
          return;
        }
        setError(formatPlizApiErrorForUser(e));
        if (!background) {
          setItems([]);
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [signOut]
  );

  const promptExtendBeg = useCallback(
    (beg: ExpiringBegApi) => {
      const opts = beg.availableExtensions;
      if (!opts.length) {
        Alert.alert(
          'Cannot extend',
          'No extension options are available. You may already be on the longest duration.'
        );
        return;
      }
      const buttons = opts.slice(0, 3).map((o) => ({
        text: `Extend to ${o.label}`,
        onPress: () => {
          void (async () => {
            try {
              const token = await getAccessToken();
              if (!token) return;
              await extendBeg(token, beg.id, o.hours as BegExpiryHours);
              Alert.alert('Extended', 'Your request will stay visible longer.');
              await loadNotifications({ background: true });
            } catch (err) {
              Alert.alert('Could not extend', formatPlizApiErrorForUser(err));
            }
          })();
        },
      }));
      Alert.alert(
        'Extend request',
        'Choose how much longer your request should stay live in the community.',
        [...buttons, { text: 'Cancel', style: 'cancel' as const }]
      );
    },
    [loadNotifications]
  );

  const listHeader = useMemo(() => {
    if (expiringBegs.length === 0 && expiredBegs.length === 0) return null;
    return (
      <View style={styles.listHeaderWrap}>
        {expiringBegs.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ending soon</Text>
            {expiringBegs.map((b) => (
              <ExpiringBegAlertCard key={b.id} beg={b} onExtend={() => promptExtendBeg(b)} />
            ))}
          </>
        ) : null}
        {expiredBegs.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Expired requests</Text>
            {expiredBegs.map((b) => (
              <ExpiredBegNoticeCard key={b.id} beg={b} />
            ))}
          </>
        ) : null}
      </View>
    );
  }, [expiringBegs, expiredBegs, promptExtendBeg]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications({ background: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await markAllNotificationsRead(token);
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        const recovered = await recoverFromUnauthorized(signOut);
        if (recovered) {
          await handleMarkAllRead();
        }
        return;
      }
      setError(formatPlizApiErrorForUser(e));
    }
  };

  const handleRowPress = async (item: NotificationListItem) => {
    if (item.unread) {
      try {
        const token = await getAccessToken();
        if (token) {
          await markNotificationRead(token, item.id);
        }
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          await recoverFromUnauthorized(signOut);
        }
      }
    }

    if (
      isSupportMessagesNotificationType(item.notificationType) ||
      item.chatId ||
      item.broadcastId
    ) {
      router.push({
        pathname: '/(tabs)/admin-messages',
        params: {
          ...(item.chatId ? { chatId: item.chatId } : {}),
          ...(item.broadcastId ? { broadcastId: item.broadcastId } : {}),
        },
      });
      return;
    }

    if (item.begId) {
      void navigateToBegDetailOrPastOverlay(item.begId);
    }
  };

  return (
    <Screen backgroundColor="#FFFFFF">
      <AppHeaderTitleRow
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        showNotification={false}
        rightSlot={
          unreadCount > 0 ? (
            <Pressable
              style={styles.markAllButton}
              onPress={() => void handleMarkAllRead()}
              accessibilityLabel="Mark all read"
              accessibilityRole="button"
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )
        }
      />

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT_BLUE} />
          <Text style={styles.loadingHint}>Loading notifications…</Text>
        </View>
      ) : null}

      {error && !loading ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadNotifications()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => void handleRowPress(item)} />
        )}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && !loading && !listHeader ? styles.listEmpty : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={ACCENT_BLUE} />
        }
        ListEmptyComponent={
          !loading && !listHeader ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                When someone supports you or sends a message, it will show up here.
              </Text>
            </View>
          ) : !loading && listHeader && items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptySubtitle}>
                No other notifications yet. Updates about donations and messages appear below when
                available.
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  headerSpacer: {
    width: 80,
  },
  listHeaderWrap: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  sectionTitleSpaced: {
    marginTop: 20,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  expiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIconWrapMuted: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 4,
  },
  expiredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  alertBody: {
    fontSize: 14,
    color: '#57534E',
    lineHeight: 20,
  },
  alertMeta: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 6,
  },
  extendBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: ACCENT_BLUE,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  extendBtnLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },
  retryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_BLUE,
    marginTop: 6,
    marginLeft: 12,
  },
});
