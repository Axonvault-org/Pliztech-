import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type PublicMemberProfile = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  role: string;
  isVerified: boolean;
  stats: {
    totalDonated: number;
    peopleHelped: number;
    requestsCount: number;
  };
  avatar: {
    displayUrl: string;
    avatarColor: string | null;
    avatarType: string;
  };
};

export async function getPublicMemberProfile(
  accessToken: string,
  userId: string
): Promise<PublicMemberProfile> {
  const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(userId)}/public-profile`), {
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
    message?: string;
    data?: { profile?: PublicMemberProfile };
  };

  if (!res.ok || data.success !== true || !data.data?.profile) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data.profile;
}
