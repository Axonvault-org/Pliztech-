import { API_BASE_URL, apiUrl } from '@/constants/api';
import { REQUEST_CATEGORIES } from '@/constants/categories';
import { avatarColorFromSeed } from '@/contexts/CurrentUserContext';
import type { GivingContribution } from '@/lib/types/activity';
import type { RecentContribution } from '@/lib/types/home';

import Ionicons from '@expo/vector-icons/Ionicons';

import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { formatBegCreatedTimeAgo } from './beg';
import { PlizApiError } from './types';

/** Must match POST /api/donations/initialize validation. */
export type DonationPaymentMethod = 'card' | 'transfer' | 'ussd' | 'bank';

export type InitializeDonationBody = {
  begId: string;
  amount: number;
  /** Backend accepts card | transfer | ussd (`bank` is normalized to transfer). */
  paymentMethod: DonationPaymentMethod;
  isAnonymous?: boolean;
  /** Optional note to the recipient (if API supports it). */
  message?: string;
  savedCardId?: string;
  /** Native app deep link — Paystack redirects here instead of the web app. */
  callbackUrl?: string;
};

/** API only allows card, transfer, ussd — not `bank`. */
function toApiPaymentMethod(
  m: DonationPaymentMethod
): 'card' | 'transfer' | 'ussd' {
  if (m === 'bank') return 'transfer';
  return m;
}

export type InitializeDonationCheckoutResult = {
  kind: 'checkout';
  donationId: string;
  amount: number;
  paymentReference: string;
  paymentUrl: string;
  quickAmounts?: number[];
};

export type InitializeDonationSavedCardResult = {
  kind: 'saved_card';
  donationId: string;
  amount: number;
  paymentReference: string;
  status?: string;
};

export type InitializeDonationResult =
  | InitializeDonationCheckoutResult
  | InitializeDonationSavedCardResult;

/** GET /api/donations/verify — confirm payment after Paystack redirect to /payment/callback */
export type VerifyDonationApiResult = {
  success: boolean;
  message: string;
  data?: {
    begId?: string;
    amount?: number;
    reference?: string;
    status?: string;
  };
};

/**
 * Calls backend to verify a Paystack transaction by reference (server runs Paystack verify + donation processing).
 * No auth header — route must be public on the API.
 */
export async function verifyDonationByReference(
  reference: string
): Promise<VerifyDonationApiResult> {
  const trimmed = reference.trim();
  if (!trimmed) {
    return { success: false, message: 'Missing payment reference.' };
  }

  const params = new URLSearchParams();
  params.set('reference', trimmed);

  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/donations/verify?${params.toString()}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    });
  } catch (err) {
    const hint = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Network error: ${hint}\n\nAPI: ${API_BASE_URL}`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      success: false,
      message: 'Invalid response from server.',
    };
  }

  const body = json as VerifyDonationApiResult;
  if (typeof body.success === 'boolean' && typeof body.message === 'string') {
    return body;
  }

  return {
    success: false,
    message: body.message ?? `Request failed (${res.status})`,
    data: body.data,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Paystack's success screen can appear before verify succeeds — retry for a short window.
 */
export async function waitForDonationVerification(
  reference: string,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<VerifyDonationApiResult | null> {
  const maxAttempts = options?.maxAttempts ?? 18;
  const intervalMs = options?.intervalMs ?? 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await verifyDonationByReference(reference);
    if (result.success) {
      return result;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  return null;
}

/**
 * POST /api/donations/initialize — Paystack checkout URL or saved-card charge.
 */
export async function initializeDonation(
  accessToken: string,
  body: InitializeDonationBody
): Promise<InitializeDonationResult> {
  const url = apiUrl('/api/donations/initialize');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        begId: body.begId,
        amount: body.amount,
        paymentMethod: toApiPaymentMethod(body.paymentMethod),
        isAnonymous: body.isAnonymous ?? false,
        ...(body.message != null && body.message !== ''
          ? { message: body.message }
          : {}),
        ...(body.savedCardId ? { savedCardId: body.savedCardId } : {}),
        ...(body.callbackUrl?.trim()
          ? { callbackUrl: body.callbackUrl.trim() }
          : {}),
      }),
    });
  } catch (err) {
    const hint =
      err instanceof Error ? err.message : String(err);
    throw new PlizApiError(
      `Network error: ${hint}\n\nAPI: ${API_BASE_URL}\n(Expo Web needs CORS on the API for this origin. Restart Expo after changing .env.)`,
      0
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    data?: ApiDonationInitializeData;
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(
      data.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(data.errors) ? data.errors : []
    );
  }

  const d = data.data;
  if (!d) {
    throw new PlizApiError('Unexpected response shape', res.status);
  }

  const amountNum =
    typeof d.amount === 'number'
      ? d.amount
      : Number((d as { amount?: unknown }).amount);
  if (!Number.isFinite(amountNum)) {
    throw new PlizApiError('Unexpected response shape', res.status);
  }

  const paymentUrl = pickCheckoutUrl(d);
  const paymentReference = pickPaymentReference(d);
  const donationId = pickDonationId(d);

  if (paymentUrl) {
    return {
      kind: 'checkout',
      donationId: donationId || paymentReference,
      amount: amountNum,
      paymentReference: paymentReference || 'pending',
      paymentUrl,
      quickAmounts: d.quick_amounts ?? d.quickAmounts,
    };
  }

  if (!paymentReference) {
    throw new PlizApiError('Unexpected response shape', res.status);
  }

  return {
    kind: 'saved_card',
    donationId: donationId || paymentReference,
    amount: amountNum,
    paymentReference,
    status: d.status ?? d.payment_method ?? d.paymentMethod,
  };
}

/** Supports snake_case (current backend) and camelCase (docs / serializers). */
type ApiDonationInitializeData = {
  amount: number;
  donation_id?: string;
  donationId?: string;
  payment_reference?: string;
  paymentReference?: string;
  reference?: string;
  payment_url?: string;
  paymentUrl?: string;
  authorizationUrl?: string;
  payment_method?: string;
  paymentMethod?: string;
  status?: string;
  quick_amounts?: number[];
  quickAmounts?: number[];
};

function pickCheckoutUrl(d: ApiDonationInitializeData): string | undefined {
  const url =
    d.payment_url ?? d.paymentUrl ?? d.authorizationUrl ?? undefined;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

function pickPaymentReference(d: ApiDonationInitializeData): string {
  const ref =
    d.payment_reference ?? d.paymentReference ?? d.reference ?? '';
  return typeof ref === 'string' ? ref : '';
}

function pickDonationId(d: ApiDonationInitializeData): string {
  const id = d.donation_id ?? d.donationId ?? '';
  return typeof id === 'string' ? id : '';
}

/** GET /api/donations/my-donations item (snake_case from backend). */
export type MyDonationApiItem = {
  id: string;
  amount: number;
  is_anonymous?: boolean;
  created_at: string;
  request: {
    id: string;
    title: string;
    status?: string;
    category?: { name: string; icon: string | null } | null;
    recipient_name?: string;
    recipient_first_name?: string;
    recipient_last_name?: string;
  };
};

export type GetMyDonationsResult = {
  donations: MyDonationApiItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

/**
 * Map category label from API (no slug on this payload) → UI category id for icons.
 */
function donationCategoryNameToUiId(name: string | undefined): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('food')) return 'food';
  if (n.includes('transport')) return 'transport';
  if (n.includes('rent') || n.includes('utilit')) return 'rent';
  if (n.includes('medical') || n.includes('health')) return 'health';
  if (n.includes('education')) return 'education';
  if (n.includes('emergency') || n.includes('family')) return 'family';
  if (n.includes('work') || n.includes('hustle')) return 'work';
  return 'help';
}

function iconForDonationUiCategory(uiId: string): keyof typeof Ionicons.glyphMap {
  const cat = REQUEST_CATEGORIES.find((c) => c.id === uiId);
  return (cat?.icon ?? 'heart-outline') as keyof typeof Ionicons.glyphMap;
}

function recipientDisplayName(d: MyDonationApiItem): string {
  const first = d.request?.recipient_first_name?.trim() ?? '';
  const last = d.request?.recipient_last_name?.trim() ?? '';
  const fromProfile = [first, last].filter(Boolean).join(' ').trim();
  if (fromProfile) return fromProfile;
  const raw = d.request?.recipient_name?.trim();
  if (raw) return raw;
  /** Backend omits names when the donor gave anonymously. */
  return 'Community member';
}

function initialForDisplayName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t.charAt(0).toUpperCase();
}

function recipientInitials(d: MyDonationApiItem, displayName: string): string {
  const first = d.request?.recipient_first_name?.trim();
  const last = d.request?.recipient_last_name?.trim();
  if (first && last) {
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }
  if (first && !last) return first.charAt(0).toUpperCase();
  if (!first && last) return last.charAt(0).toUpperCase();
  return initialForDisplayName(displayName);
}

/** Map GET /api/donations/my-donations row → Home “My recent contributions” row. */
export function myDonationToRecentContribution(d: MyDonationApiItem): RecentContribution {
  return {
    id: d.id,
    contributorName: recipientDisplayName(d),
    description: (d.request.title ?? 'Help request').trim() || 'Help request',
    amount: Math.round(Number(d.amount) || 0),
    timeAgo: formatBegCreatedTimeAgo(d.created_at),
  };
}

/** Map GET /api/donations/my-donations row → Activity “Giving” list row. */
export function myDonationToGivingContribution(d: MyDonationApiItem): GivingContribution {
  const recipientName = recipientDisplayName(d);
  const categoryId = donationCategoryNameToUiId(d.request?.category?.name);
  return {
    id: d.id,
    requestId: d.request.id,
    recipientName,
    recipientInitial: recipientInitials(d, recipientName),
    recipientColor: avatarColorFromSeed(d.request.id),
    description: (d.request.title ?? 'Help request').trim() || 'Help request',
    amount: Math.round(Number(d.amount) || 0),
    timeAgo: formatBegCreatedTimeAgo(d.created_at),
    categoryId,
    icon: iconForDonationUiCategory(categoryId),
  };
}

/**
 * Summary stats from loaded donations only (approximate if pagination loads a subset).
 */
export function summarizeGivingDonations(donations: MyDonationApiItem[]): {
  totalGiven: number;
  peopleHelped: number;
  thisMonth: number;
  avgGift: number;
} {
  const totalGiven = Math.round(
    donations.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  );
  const peopleHelped = new Set(
    donations.map((d) => d.request?.id).filter(Boolean)
  ).size;
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const thisMonth = Math.round(
    donations
      .filter((d) => {
        const dt = new Date(d.created_at);
        return dt.getFullYear() === y && dt.getMonth() === mo;
      })
      .reduce((s, d) => s + (Number(d.amount) || 0), 0)
  );
  const n = donations.length;
  const avgGift = n > 0 ? Math.round(totalGiven / n) : 0;
  return { totalGiven, peopleHelped, thisMonth, avgGift };
}

/**
 * GET /api/donations/my-donations — current user’s successful donations (Bearer required).
 */
export async function getMyDonations(
  accessToken: string,
  options?: { page?: number; limit?: number }
): Promise<GetMyDonationsResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  const res = await fetch(
    `${apiUrl('/api/donations/my-donations')}?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

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
      donations?: MyDonationApiItem[];
      pagination?: { page: number; limit: number; total: number; pages: number };
    };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const donations = data.data?.donations ?? [];
  const p = data.data?.pagination;
  return {
    donations,
    pagination: {
      page: p?.page ?? page,
      limit: p?.limit ?? limit,
      total: p?.total ?? donations.length,
      pages: p?.pages ?? 1,
    },
  };
}

/** GET /api/donations/beg/:begId — successful donations for a beg (public). */
export type BegDonationApiItem = {
  id: string;
  amount: number;
  is_anonymous?: boolean;
  donor_name?: string;
  created_at: string;
};

export type GetBegDonationsResult = {
  donations: BegDonationApiItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

/**
 * GET /api/donations/beg/:begId — list donors for a request (no auth).
 */
export async function getBegDonations(
  begId: string,
  options?: { page?: number; limit?: number }
): Promise<GetBegDonationsResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  const res = await fetch(
    `${apiUrl(`/api/donations/beg/${encodeURIComponent(begId)}`)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  );

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
      donations?: BegDonationApiItem[];
      pagination?: { page: number; limit: number; total: number; pages: number };
    };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  const donations = data.data?.donations ?? [];
  const p = data.data?.pagination;
  return {
    donations,
    pagination: {
      page: p?.page ?? page,
      limit: p?.limit ?? limit,
      total: p?.total ?? donations.length,
      pages: p?.pages ?? 1,
    },
  };
}
