import { apiUrl } from '@/constants/api';
import { getAccessToken } from '@/lib/auth/access-token';
import { PlizApiError } from './types';

export type NotificationPreferences = {
  pushEnabled: boolean;
  pushEnabledAt: string | null;
  emailSuppressed: boolean;
  emailSuppressReason: string | null;
  transactionalEmailEnabled: boolean;
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const token = await getAccessToken();
  if (!token) {
    throw new PlizApiError('Not authenticated', 401);
  }

  const res = await fetch(apiUrl('/api/auth/notification-preferences'), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: NotificationPreferences;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new PlizApiError(json.message ?? 'Failed to load preferences', res.status);
  }

  return json.data;
}

export async function patchNotificationPreferences(input: {
  pushEnabled?: boolean;
}): Promise<NotificationPreferences> {
  const token = await getAccessToken();
  if (!token) {
    throw new PlizApiError('Not authenticated', 401);
  }

  const res = await fetch(apiUrl('/api/auth/notification-preferences'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: NotificationPreferences;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new PlizApiError(json.message ?? 'Failed to update preferences', res.status);
  }

  return json.data;
}
