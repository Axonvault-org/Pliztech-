import type { BrowseRequest } from '@/lib/types/home';

export interface RequestDetail extends BrowseRequest {
  /** Beg owner — hide donation UI when same as current user */
  ownerUserId?: string;
  /** When true, requester identity is hidden and profile is not viewable. */
  isAnonymous?: boolean;
  /** From API; `false` until admin approves. */
  approved?: boolean;
  /** From API: false when expired, funded, cancelled, or not yet approved. */
  canDonate?: boolean;
  /** Set when the signed-in viewer has donated to this request. */
  viewerDonation?: {
    totalAmount: number;
    donationCount: number;
    lastDonatedAt: string;
  } | null;
  fullDescription: string;
  timeAgo: string;
  timeRemaining: string;
  thumbsUp: number;
  hearts: number;
  gifts: number;
  crowns: number;
  messages: number;
}

const PLATFORM_FEE_PERCENT = 5;
const VAT_ON_PLATFORM_FEE_PERCENT = 7.5;

export function getRequestReceives(amount: number): number {
  return amount - getPlatformFee(amount) - getVatOnPlatformFee(amount);
}

export function getPlatformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

export function getVatOnPlatformFee(amount: number): number {
  return Math.round((getPlatformFee(amount) * VAT_ON_PLATFORM_FEE_PERCENT) / 100);
}
