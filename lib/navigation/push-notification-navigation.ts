import { type Href } from 'expo-router';

import { isSupportMessagesNotificationType } from '@/lib/api/notifications';
import { pushWithHomeBehind } from '@/lib/navigation/home-navigation';
import { navigateToSupportFromNotification } from '@/lib/navigation/in-app-notification-navigation';
import { navigateToBegDetailOrPastOverlay } from '@/lib/navigation/post-donation-navigation';

function readId(data: Record<string, unknown>, snake: string, camel: string): string | undefined {
  const a = data[snake];
  const b = data[camel];
  if (typeof a === 'string' && a.length > 0) return a;
  if (typeof b === 'string' && b.length > 0) return b;
  return undefined;
}

/** Navigate from an OS push tap — mirrors inbox row routing, with Home behind Back. */
export function navigateFromPushNotificationData(
  data: Record<string, unknown> | undefined
): void {
  if (!data) return;

  const type = typeof data.type === 'string' ? data.type : '';
  const chatId = readId(data, 'chat_id', 'chatId');
  const broadcastId = readId(data, 'broadcast_id', 'broadcastId');
  const begId = readId(data, 'beg_id', 'begId');

  if (isSupportMessagesNotificationType(type) || chatId || broadcastId) {
    navigateToSupportFromNotification({ chatId, broadcastId });
    return;
  }

  if (begId) {
    void navigateToBegDetailOrPastOverlay(begId, { ensureHomeBehindDetail: true });
    return;
  }

  pushWithHomeBehind('/(tabs)/notifications' as Href);
}
