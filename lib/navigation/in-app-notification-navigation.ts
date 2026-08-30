import { type Href } from 'expo-router';

import {
  isSupportMessagesNotificationType,
  type NotificationListItem,
} from '@/lib/api/notifications';
import { pushWithHomeBehind } from '@/lib/navigation/home-navigation';
import { navigateToBegDetailOrPastOverlay } from '@/lib/navigation/post-donation-navigation';

export function navigateToSupportFromNotification(params: {
  chatId?: string;
  broadcastId?: string;
}): void {
  pushWithHomeBehind({
    pathname: '/(tabs)/admin-messages',
    params: {
      from: 'notification',
      ...(params.chatId ? { chatId: params.chatId } : {}),
      ...(params.broadcastId ? { broadcastId: params.broadcastId } : {}),
    },
  } as Href);
}

export function navigateToNotificationDetail(item: {
  id: string;
  title: string;
  body: string;
  timeAgo: string;
  icon: string;
  iconColor: string;
  unread?: boolean;
}): void {
  pushWithHomeBehind({
    pathname: '/(tabs)/notification/[id]',
    params: {
      id: item.id,
      title: item.title,
      body: item.body,
      timeAgo: item.timeAgo,
      icon: item.icon,
      iconColor: item.iconColor,
      unread: item.unread ? '1' : '0',
    },
  } as unknown as Href);
}

/**
 * Inbox row tap. Destinations are pushed with Home underneath so Back
 * returns to the application home page (PLZ-24).
 */
export function navigateFromInAppNotification(item: NotificationListItem): void {
  if (
    isSupportMessagesNotificationType(item.notificationType) ||
    item.chatId ||
    item.broadcastId
  ) {
    navigateToSupportFromNotification({
      chatId: item.chatId,
      broadcastId: item.broadcastId,
    });
    return;
  }

  if (item.begId) {
    void navigateToBegDetailOrPastOverlay(item.begId, { ensureHomeBehindDetail: true });
    return;
  }

  navigateToNotificationDetail(item);
}
