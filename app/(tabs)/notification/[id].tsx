import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useHardwareBackToHome } from '@/hooks/useHardwareBackToHome';
import { markNotificationRead, type NotificationListIcon } from '@/lib/api/notifications';
import { getAccessToken } from '@/lib/auth/access-token';
import { navigateToHome } from '@/lib/navigation/home-navigation';

const ACCENT_BLUE = '#2E8BEA';

const ICON_MAP: Record<NotificationListIcon, keyof typeof Ionicons.glyphMap> = {
  heart: 'heart-outline',
  'checkmark-circle': 'checkmark-circle-outline',
  chatbubble: 'chatbubble-outline',
  megaphone: 'megaphone-outline',
  time: 'time-outline',
  'alert-circle': 'alert-circle-outline',
  gift: 'gift-outline',
};

function firstParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function isNotificationListIcon(value: string): value is NotificationListIcon {
  return value in ICON_MAP;
}

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    title?: string | string[];
    body?: string | string[];
    timeAgo?: string | string[];
    icon?: string | string[];
    iconColor?: string | string[];
    unread?: string | string[];
  }>();

  useHardwareBackToHome();

  const id = firstParam(params.id);
  const title = firstParam(params.title) || 'Notification';
  const body = firstParam(params.body);
  const timeAgo = firstParam(params.timeAgo);
  const iconRaw = firstParam(params.icon);
  const icon: NotificationListIcon = isNotificationListIcon(iconRaw) ? iconRaw : 'gift';
  const iconColor = firstParam(params.iconColor) || ACCENT_BLUE;
  const unread = firstParam(params.unread) === '1';

  useEffect(() => {
    if (!id || !unread) return;
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await markNotificationRead(token, id);
      } catch {
        /* list already attempted mark-read; keep the detail readable */
      }
    })();
  }, [id, unread]);

  const iconName = ICON_MAP[icon];

  return (
    <Screen backgroundColor="#FFFFFF" scrollable>
      <AppHeaderTitleRow
        title="Notification"
        onPressBack={navigateToHome}
        showNotification={false}
        backIconColor="#1F2937"
      />
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={28} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {timeAgo ? <Text style={styles.timeAgo}>{timeAgo}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  timeAgo: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
