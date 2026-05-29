import { apiUrl } from '@/constants/api';

import { PlizApiError } from './types';

/**
 * Saved card row from GET /api/payment-methods/cards (Prisma → JSON, camelCase).
 */
export type SavedCard = {
  id: string;
  cardType: string;
  last4: string;
  expMonth: number;
  expYear: number;
  bank: string | null;
  isDefault: boolean;
  createdAt: string;
};

function parseCardsJson(res: Response, json: unknown): SavedCard[] {
  const data = json as {
    success?: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    data?: { cards?: SavedCard[] };
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(
      data.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(data.errors) ? data.errors : []
    );
  }

  const cards = data.data?.cards;
  if (!Array.isArray(cards)) {
    throw new PlizApiError('Unexpected response shape', res.status);
  }

  return cards.map((c) => ({
    id: String(c.id),
    cardType: String(c.cardType ?? ''),
    last4: String(c.last4 ?? ''),
    expMonth: Number(c.expMonth) || 0,
    expYear: Number(c.expYear) || 0,
    bank: c.bank != null ? String(c.bank) : null,
    isDefault: Boolean(c.isDefault),
    createdAt: String(c.createdAt ?? ''),
  }));
}

/**
 * GET /api/payment-methods/cards
 */
export async function getSavedCards(accessToken: string): Promise<SavedCard[]> {
  const res = await fetch(apiUrl('/api/payment-methods/cards'), {
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

  return parseCardsJson(res, json);
}

/**
 * PATCH /api/payment-methods/cards/:id/default
 */
export async function setDefaultSavedCard(accessToken: string, cardId: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/payment-methods/cards/${encodeURIComponent(cardId)}/default`),
    {
      method: 'PATCH',
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
    errors?: { field: string; message: string }[];
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(
      data.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(data.errors) ? data.errors : []
    );
  }
}

/**
 * DELETE /api/payment-methods/cards/:id
 */
export async function deleteSavedCard(accessToken: string, cardId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/payment-methods/cards/${encodeURIComponent(cardId)}`), {
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
    errors?: { field: string; message: string }[];
  };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(
      data.message ?? `Request failed (${res.status})`,
      res.status,
      Array.isArray(data.errors) ? data.errors : []
    );
  }
}

/** Display label for card network (e.g. visa → Visa). */
export function formatCardBrandLabel(cardType: string): string {
  const t = cardType?.trim().toLowerCase() ?? '';
  if (!t) return 'Card';
  if (t === 'visa') return 'Visa';
  if (t === 'mastercard') return 'Mastercard';
  if (t === 'verve') return 'Verve';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
