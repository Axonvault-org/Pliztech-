import { apiUrl } from '@/constants/api';

import { PlizApiError } from './types';

export type WithdrawalApiItem = {
  id: string;
  amount_raised: number;
  company_fee: number;
  vat_fee: number;
  total_fees: number;
  amount_received: number;
  status: string;
  transfer_reference?: string | null;
  failure_reason?: string | null;
  auto_processed?: boolean;
  beg: { id: string; title: string };
  bank_account: {
    account_number: string;
    account_name: string;
    bank_name: string;
  };
  created_at: string;
  processed_at?: string | null;
};

export type GetWithdrawalsResult = {
  withdrawals: WithdrawalApiItem[];
  total: number;
  pages: number;
};

/**
 * GET /api/withdrawals — withdrawal history for the current user.
 */
export async function getUserWithdrawals(
  accessToken: string,
  options?: { page?: number; limit?: number }
): Promise<GetWithdrawalsResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${apiUrl('/api/withdrawals')}?${params}`, {
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

  const data = json as {
    success?: boolean;
    message?: string;
    data?: {
      withdrawals?: WithdrawalApiItem[];
      total?: number;
      pages?: number;
    };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const list = data.data?.withdrawals ?? [];
  return {
    withdrawals: list,
    total: typeof data.data?.total === 'number' ? data.data.total : list.length,
    pages: typeof data.data?.pages === 'number' ? data.data.pages : 1,
  };
}

/** Most recent withdrawal for a beg, if any. */
export function latestWithdrawalForBeg(
  withdrawals: WithdrawalApiItem[],
  begId: string
): WithdrawalApiItem | undefined {
  const forBeg = withdrawals.filter((w) => w.beg.id === begId);
  forBeg.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return forBeg[0];
}

export type RequestWithdrawalBody = {
  begId: string;
  bankAccountId?: string;
  transactionPin: string;
};

/**
 * POST /api/withdrawals/request
 */
export type RequestWithdrawalResult = {
  message: string;
  data: unknown;
};

export async function requestWithdrawal(
  accessToken: string,
  body: RequestWithdrawalBody
): Promise<RequestWithdrawalResult> {
  const res = await fetch(apiUrl('/api/withdrawals/request'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      begId: body.begId,
      transactionPin: body.transactionPin,
      ...(body.bankAccountId ? { bankAccountId: body.bankAccountId } : {}),
    }),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const payload = json as {
    success?: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    data?: unknown;
  };

  if (!res.ok || payload.success !== true) {
    throw new PlizApiError(
      payload.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(payload.errors) ? payload.errors : []
    );
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : 'Withdrawal submitted.',
    data: payload.data,
  };
}
