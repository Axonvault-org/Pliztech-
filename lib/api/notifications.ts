import { apiUrl } from '@/constants/api';

import { PlizApiError } from './types';

/** Notification `type` values from the Plz API / Prisma. */
export type NotificationApiType =
  | 'beg_approved'
  | 'beg_funded'
  | 'donation_received'
  | 'message_received'
  | 'donor_reply'
  | 'beg_expiring'
  | 'beg_expired'
  | 'evidence_flagged'
  | 'evidence_spam_alert'
  | 'evidence_visibility_changed'
  | 'admin_chat_started'
  | 'admin_chat_message'
  | 'admin_broadcast';

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type GetNotificationsResult = {
  notifications: ApiNotification[];
  unreadCount: number;
  pagination: NotificationsPagination;
};

export type NotificationListIcon =
  | 'heart'
  | 'checkmark-circle'
  | 'chatbubble'
  | 'megaphone'
  | 'time'
  | 'alert-circle'
  | 'gift';

/** Row model for the notifications list UI. */
export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  timeAgo: string;
  unread: boolean;
  icon: NotificationListIcon;
  iconColor: string;
  /** Deep link to request detail when present. */
  begId?: string;
  donationId?: string;
  /** Support chat deep link when present. */
  chatId?: string;
  /** Support broadcast deep link when present. */
  broadcastId?: string;
  /** Original API notification type for routing. */
  notificationType: string;
};

export function isSupportChatNotificationType(type: string): boolean {
  return type === 'admin_chat_started' || type === 'admin_chat_message';
}

export function isSupportBroadcastNotificationType(type: string): boolean {
  return type === 'admin_broadcast';
}

export function isSupportMessagesNotificationType(type: string): boolean {
  return isSupportChatNotificationType(type) || isSupportBroadcastNotificationType(type);
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(data: Record<string, unknown> | null, snake: string, camel: string): string | undefined {
  if (!data) return undefined;
  const a = data[snake];
  const b = data[camel];
  if (typeof a === 'string' && a.length > 0) return a;
  if (typeof b === 'string' && b.length > 0) return b;
  return undefined;
}

/**
 * Relative time label for notification rows (English).
 */
export function formatNotificationTimeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function iconForType(type: string): { icon: NotificationListIcon; iconColor: string } {
  switch (type) {
    case 'donation_received':
      return { icon: 'heart', iconColor: '#2E8BEA' };
    case 'beg_approved':
    case 'beg_funded':
      return { icon: 'checkmark-circle', iconColor: '#22C55E' };
    case 'beg_expiring':
      return { icon: 'time', iconColor: '#EA580C' };
    case 'beg_expired':
      return { icon: 'alert-circle', iconColor: '#DC2626' };
    case 'message_received':
    case 'donor_reply':
    case 'admin_chat_started':
    case 'admin_chat_message':
      return { icon: 'chatbubble', iconColor: '#8B5CF6' };
    case 'admin_broadcast':
      return { icon: 'megaphone', iconColor: '#7C3AED' };
    case 'evidence_flagged':
    case 'evidence_spam_alert':
    case 'evidence_visibility_changed':
      return { icon: 'alert-circle', iconColor: '#DC2626' };
    default:
      return { icon: 'gift', iconColor: '#38BDF8' };
  }
}

export function mapApiNotificationToListItem(n: ApiNotification): NotificationListItem {
  const data = parseJsonRecord(n.data);
  const begId = readString(data, 'beg_id', 'begId');
  const donationId = readString(data, 'donation_id', 'donationId');
  const chatId = readString(data, 'chat_id', 'chatId');
  const broadcastId = readString(data, 'broadcast_id', 'broadcastId');
  const { icon, iconColor } = iconForType(n.type);

  return {
    id: n.id,
    title: n.title,
    body: n.body,
    timeAgo: formatNotificationTimeAgo(n.created_at),
    unread: !n.is_read,
    icon,
    iconColor,
    notificationType: n.type,
    ...(begId ? { begId } : {}),
    ...(donationId ? { donationId } : {}),
    ...(chatId ? { chatId } : {}),
    ...(broadcastId ? { broadcastId } : {}),
  };
}

async function parsePlizResponse<T>(res: Response): Promise<{ ok: boolean; data: T | undefined; message?: string }> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const body = json as {
    success?: boolean;
    message?: string;
    data?: T;
    errors?: { field: string; message: string }[];
  };
  if (!res.ok || body.success !== true) {
    throw new PlizApiError(
      body.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(body.errors) ? body.errors : []
    );
  }
  return { ok: true, data: body.data, message: body.message };
}

/**
 * GET /api/notifications — paginated inbox for the current user.
 */
export async function getNotifications(
  accessToken: string,
  options?: { page?: number; limit?: number }
): Promise<GetNotificationsResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 30;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${apiUrl('/api/notifications')}?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const body = json as {
    success?: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    data?: {
      notifications: ApiNotification[];
      unread_count: number;
      pagination: NotificationsPagination;
    };
  };

  if (!res.ok || body.success !== true) {
    throw new PlizApiError(
      body.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(body.errors) ? body.errors : []
    );
  }

  const d = body.data;
  if (!d?.notifications || !Array.isArray(d.notifications)) {
    throw new PlizApiError('Unexpected response shape', res.status);
  }

  return {
    notifications: d.notifications,
    unreadCount: typeof d.unread_count === 'number' ? d.unread_count : 0,
    pagination: d.pagination ?? { page, limit, total: d.notifications.length, pages: 1 },
  };
}

/**
 * GET /api/notifications/unread-count — lightweight badge poll.
 */
export async function getUnreadNotificationCount(accessToken: string): Promise<number> {
  const res = await fetch(apiUrl('/api/notifications/unread-count'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { data } = await parsePlizResponse<{ unread_count: number }>(res);
  if (data == null || typeof data.unread_count !== 'number') {
    throw new PlizApiError('Unexpected response shape', res.status);
  }
  return data.unread_count;
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markNotificationRead(accessToken: string, notificationId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/notifications/${encodeURIComponent(notificationId)}/read`), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parsePlizResponse<unknown>(res);
}

/**
 * PATCH /api/notifications/read-all
 */
export async function markAllNotificationsRead(accessToken: string): Promise<void> {
  const res = await fetch(apiUrl('/api/notifications/read-all'), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parsePlizResponse<unknown>(res);
}

/**
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(accessToken: string, notificationId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/notifications/${encodeURIComponent(notificationId)}`), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parsePlizResponse<unknown>(res);
}
