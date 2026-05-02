import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type ReactionTargetType = 'beg' | 'donation';

export type ReactionCount = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export type ReactionsPayload = {
  targetId: string;
  targetType: ReactionTargetType;
  totalReactions: number;
  reactions: ReactionCount[];
  userReaction: string | null;
};

export async function getReactions(
  accessToken: string,
  targetType: ReactionTargetType,
  targetId: string
): Promise<ReactionsPayload> {
  const res = await fetch(apiUrl(`/api/reactions/${targetType}/${targetId}`), {
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
    data?: ReactionsPayload;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data;
}

export async function toggleReaction(
  accessToken: string,
  targetType: ReactionTargetType,
  targetId: string,
  emoji: string
): Promise<ReactionsPayload> {
  const res = await fetch(apiUrl('/api/reactions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify({ targetType, targetId, emoji }),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    data?: ReactionsPayload;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data;
}
