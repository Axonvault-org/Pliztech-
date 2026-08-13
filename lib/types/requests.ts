import type { BrowseRequest } from '@/lib/types/home';

export {
  getPlatformFee,
  getRequestReceives,
  getVatOnPlatformFee,
  PLATFORM_FEE_PERCENT,
  VAT_ON_PLATFORM_FEE_PERCENT,
} from '@/lib/withdrawal-fees';

export interface RequestDetail extends BrowseRequest {
  /** Beg owner — hide donation UI when same as current user */
  ownerUserId?: string;
  /** When true, requester identity is hidden and profile is not viewable. */
  isAnonymous?: boolean;
  /** From API; `false` until admin approves. */
  approved?: boolean;
  /** From API: false when expired, funded, cancelled, or not yet approved. */
  canDonate?: boolean;
  /** Raw beg status from API (e.g. active, funded, expired, withdrawn). */
  begStatus?: string;
  /** True after owner has withdrawn donations for this request. */
  isWithdrawn?: boolean;
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
