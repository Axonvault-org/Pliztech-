import type { BegFeedItem } from '@/lib/api/beg';
import { isBegPastOrClosedForDonorNav } from '@/lib/api/beg';

/** Whether a feed beg is open for new donations from other users. */
export function begAcceptsDonations(beg: BegFeedItem): boolean {
  if (!beg.approved) return false;
  return !isBegPastOrClosedForDonorNav(beg);
}

