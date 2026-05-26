import { apiUrl } from '@/constants/api';

import { PlizApiError } from './types';

export type TransactionPinStatus = {
  hasPin: boolean;
  locked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  maxFailedAttempts: number;
};

async function parseJson(res: Response): Promise<{
  success?: boolean;
  message?: string;
  data?: unknown;
  errors?: { field: string; message: string }[];
}> {
  try {
    return (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: unknown;
      errors?: { field: string; message: string }[];
    };
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
}

function authHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getTransactionPinStatus(
  accessToken: string
): Promise<TransactionPinStatus> {
  const res = await fetch(apiUrl('/api/security/transaction-pin/status'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await parseJson(res);
  if (!res.ok || payload.success !== true) {
    throw new PlizApiError(payload.message ?? `Request failed (${res.status})`, res.status);
  }
  const data = payload.data as Partial<TransactionPinStatus> | undefined;
  return {
    hasPin: Boolean(data?.hasPin),
    locked: Boolean(data?.locked),
    lockedUntil: typeof data?.lockedUntil === 'string' ? data.lockedUntil : null,
    failedAttempts: typeof data?.failedAttempts === 'number' ? data.failedAttempts : 0,
    maxFailedAttempts: typeof data?.maxFailedAttempts === 'number' ? data.maxFailedAttempts : 5,
  };
}

export async function setupTransactionPin(accessToken: string, pin: string): Promise<void> {
  const res = await fetch(apiUrl('/api/security/transaction-pin/setup'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ pin }),
  });
  const payload = await parseJson(res);
  if (!res.ok || payload.success !== true) {
    throw new PlizApiError(
      payload.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(payload.errors) ? payload.errors : []
    );
  }
}

export async function changeTransactionPin(
  accessToken: string,
  currentPin: string,
  newPin: string
): Promise<void> {
  const res = await fetch(apiUrl('/api/security/transaction-pin/change'), {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ currentPin, newPin }),
  });
  const payload = await parseJson(res);
  if (!res.ok || payload.success !== true) {
    throw new PlizApiError(
      payload.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(payload.errors) ? payload.errors : []
    );
  }
}
