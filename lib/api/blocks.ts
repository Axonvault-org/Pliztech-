import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type BlockedUserRow = {
  id: string;
  username: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  blockedAt: string;
};

export type GetBlockedUsersResult = {
  blockedUsers: BlockedUserRow[];
  total: number;
  pages: number;
};

export async function blockUser(accessToken: string, userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/blocks/${encodeURIComponent(userId)}`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean } | null;
  if (!res.ok || data?.success === false) {
    throw apiFailureFromResponseJson(json, res.status);
  }
}

export async function unblockUser(accessToken: string, userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/blocks/${encodeURIComponent(userId)}`), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean } | null;
  if (!res.ok || data?.success === false) {
    throw apiFailureFromResponseJson(json, res.status);
  }
}

export async function getBlockedUsers(
  accessToken: string,
  page = 1,
  limit = 50
): Promise<GetBlockedUsersResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(apiUrl(`/api/blocks?${params}`), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    data?: GetBlockedUsersResult;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return {
    blockedUsers: Array.isArray(data.data.blockedUsers) ? data.data.blockedUsers : [],
    total: data.data.total ?? 0,
    pages: data.data.pages ?? 1,
  };
}
