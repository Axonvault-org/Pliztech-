import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type CommunityFund = {
  total_received: number;
  total_allocated: number;
  available_balance: number;
  donation_count: number;
};

export type CommunityPulseDonation = {
  id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
};

export type CommunityPulseFeed = {
  fund: CommunityFund;
  donations: CommunityPulseDonation[];
  total: number;
  pages: number;
  page: number;
};

export type InitializeCommunityPulseBody = {
  amount: number;
  donorName?: string;
  donorEmail: string;
  isAnonymous?: boolean;
  message?: string;
  redirectUrl?: string;
};

export type InitializeCommunityPulseResult = {
  tx_ref: string;
  payment_url: string;
  amount: number;
};

export type VerifyCommunityPulseResult = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};

export async function getCommunityPulseFeed(options?: {
  page?: number;
  limit?: number;
}): Promise<CommunityPulseFeed> {
  const params = new URLSearchParams({
    page: String(options?.page ?? 1),
    limit: String(options?.limit ?? 20),
  });
  const res = await fetch(`${apiUrl('/api/community-pulse')}?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: CommunityPulseFeed };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export async function initializeCommunityPulseDonation(
  accessToken: string | null,
  body: InitializeCommunityPulseBody
): Promise<InitializeCommunityPulseResult> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(apiUrl('/api/community-pulse/donate'), {
    method: 'POST',
    headers,
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: InitializeCommunityPulseResult };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export async function verifyCommunityPulseDonation(input: {
  txRef: string;
  transactionId?: string;
}): Promise<VerifyCommunityPulseResult> {
  const res = await fetch(apiUrl('/api/community-pulse/verify'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify({
      tx_ref: input.txRef,
      transaction_id: input.transactionId,
    }),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: VerifyCommunityPulseResult };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export function getCommunityPulseWebRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/community-purse`;
  }
  const base = (
    process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() ||
    (__DEV__ ? 'http://localhost:8081' : 'https://app.plz.ng')
  ).replace(/\/$/, '');
  return `${base}/community-purse`;
}
