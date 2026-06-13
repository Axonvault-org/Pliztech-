import { apiUrl } from '@/constants/api';

import { PlizApiError } from './types';

export type NigerianBank = {
  name: string;
  code: string;
  slug: string;
};

/**
 * GET /api/withdrawals/banks — Nigerian banks.
 */
export async function getWithdrawalBanks(): Promise<NigerianBank[]> {
  const res = await fetch(apiUrl('/api/withdrawals/banks'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
    data?: { banks?: NigerianBank[] };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return Array.isArray(data.data?.banks) ? data.data!.banks! : [];
}

export type ResolveBankAccountResult = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
};

/**
 * POST /api/withdrawals/resolve-account — bank account name lookup (authenticated).
 */
export async function resolveWithdrawalBankAccount(
  accessToken: string,
  body: { accountNumber: string; bankCode: string }
): Promise<ResolveBankAccountResult> {
  const res = await fetch(apiUrl('/api/withdrawals/resolve-account'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      accountNumber: body.accountNumber.trim(),
      bankCode: body.bankCode.trim(),
    }),
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
    data?: ResolveBankAccountResult;
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const resolved = data.data;
  if (!resolved?.accountName) {
    throw new PlizApiError('Invalid resolve response', res.status);
  }

  return resolved;
}

export type WithdrawalBankAccount = {
  id: string;
  accountNumber: string;
  accountNumberLast4?: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  isVerified?: boolean;
  isDefault?: boolean;
};

/**
 * POST /api/withdrawals/bank-accounts — verify and save bank account.
 */
export async function addWithdrawalBankAccount(
  accessToken: string,
  body: { accountNumber: string; bankCode: string }
): Promise<WithdrawalBankAccount> {
  const res = await fetch(apiUrl('/api/withdrawals/bank-accounts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      accountNumber: body.accountNumber.trim(),
      bankCode: body.bankCode.trim(),
    }),
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
    data?: { bankAccount?: WithdrawalBankAccount };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const acc = data.data?.bankAccount;
  if (!acc?.id) {
    throw new PlizApiError('Invalid bank account response', res.status);
  }

  return acc;
}

function normalizeBankAccountBody(body: {
  accountNumber: string;
  bankCode: string;
}): { accountNumber: string; bankCode: string } {
  return {
    accountNumber: body.accountNumber.trim(),
    bankCode: body.bankCode.trim(),
  };
}

function accountLast4(account: WithdrawalBankAccount): string {
  if (account.accountNumberLast4?.trim()) {
    return account.accountNumberLast4.trim();
  }
  const digits = account.accountNumber.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

/** Match saved account by bank code + last 4 digits (API masks full account numbers). */
export function findMatchingWithdrawalBankAccount(
  accounts: WithdrawalBankAccount[],
  body: { accountNumber: string; bankCode: string }
): WithdrawalBankAccount | undefined {
  const { accountNumber, bankCode } = normalizeBankAccountBody(body);
  const inputLast4 = accountNumber.replace(/\D/g, '').slice(-4);
  if (inputLast4.length !== 4) return undefined;

  return accounts.find(
    (a) =>
      a.bankCode.trim() === bankCode &&
      accountLast4(a) === inputLast4
  );
}

/**
 * Return an existing saved account or create one after Flutterwave verify.
 * Avoids duplicate-add errors when the user retries step 2.
 */
export async function ensureWithdrawalBankAccount(
  accessToken: string,
  body: { accountNumber: string; bankCode: string }
): Promise<WithdrawalBankAccount> {
  const normalized = normalizeBankAccountBody(body);
  const existingAccounts = await getWithdrawalBankAccounts(accessToken);
  const alreadySaved = findMatchingWithdrawalBankAccount(
    existingAccounts,
    normalized
  );
  if (alreadySaved) {
    return alreadySaved;
  }

  try {
    return await addWithdrawalBankAccount(accessToken, normalized);
  } catch (e) {
    if (
      e instanceof PlizApiError &&
      e.message.toLowerCase().includes('already added')
    ) {
      const refreshed = await getWithdrawalBankAccounts(accessToken);
      const match = findMatchingWithdrawalBankAccount(refreshed, normalized);
      if (match) return match;
    }
    throw e;
  }
}

/**
 * GET /api/withdrawals/bank-accounts — saved accounts for current user.
 */
export async function getWithdrawalBankAccounts(
  accessToken: string
): Promise<WithdrawalBankAccount[]> {
  const res = await fetch(apiUrl('/api/withdrawals/bank-accounts'), {
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
    data?: { accounts?: WithdrawalBankAccount[] };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const raw = data.data?.accounts ?? [];
  return raw.map((a) => ({
    id: String(a.id),
    accountNumber: String(a.accountNumber ?? ''),
    accountNumberLast4: a.accountNumberLast4
      ? String(a.accountNumberLast4)
      : undefined,
    accountName: String(a.accountName ?? ''),
    bankCode: String(a.bankCode ?? ''),
    bankName: String(a.bankName ?? ''),
    isVerified: a.isVerified,
    isDefault: a.isDefault,
  }));
}
