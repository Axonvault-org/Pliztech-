import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type SupportCategory =
  | 'account'
  | 'payment'
  | 'beg'
  | 'donation'
  | 'kyc'
  | 'technical'
  | 'other';

export type CreateSupportTicketBody = {
  subject: string;
  category: SupportCategory;
  message: string;
  contactEmail: string;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportCategory;
  status: string;
  priority: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
};

export async function createSupportTicket(
  accessToken: string,
  body: CreateSupportTicketBody
): Promise<SupportTicket> {
  const res = await fetch(apiUrl('/api/support/tickets'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    data?: { ticket?: SupportTicket } | SupportTicket;
  };

  const ticket =
    data.data && 'ticket' in data.data
      ? data.data.ticket
      : (data.data as SupportTicket | undefined);

  if (!res.ok || data.success !== true || !ticket) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return ticket;
}
