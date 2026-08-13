import { apiUrl } from '@/constants/api';
import { getAccessToken } from '@/lib/auth/access-token';
import { PlizApiError } from './types';

export async function registerPushToken(input: {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  appVersion?: string;
}): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new PlizApiError('Not authenticated', 401);
  }

  const res = await fetch(apiUrl('/api/notifications/push-token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    throw new PlizApiError(json.message ?? 'Failed to register push token', res.status);
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const res = await fetch(apiUrl('/api/notifications/push-token'), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const json = (await res.json()) as { message?: string };
    throw new PlizApiError(json.message ?? 'Failed to unregister push token', res.status);
  }
}
