import { apiUrl } from '@/constants/api';
import { PlizApiError } from '@/lib/api/types';

export type LogoutOtherSessionsResult = {
  sessionsLoggedOut: number;
};

export async function logoutOtherSessions(
  accessToken: string
): Promise<LogoutOtherSessionsResult> {
  const res = await fetch(apiUrl('/api/sessions/others'), {
    method: 'DELETE',
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

  const data = json as {
    success?: boolean;
    message?: string;
    data?: { sessionsLoggedOut?: number };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return {
    sessionsLoggedOut: data.data?.sessionsLoggedOut ?? 0,
  };
}
