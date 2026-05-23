import type { BegFeedItem } from '@/lib/api/beg';

type WithdrawableBegFields = Pick<BegFeedItem, 'status' | 'expiresAt' | 'amountRaised'>;

/** True when the request is fully funded or its expiry time has passed. */
export function isBegRequestPeriodEnded(
  beg: Pick<BegFeedItem, 'status' | 'expiresAt'>
): boolean {
  if (beg.status === 'funded' || beg.status === 'expired') return true;
  const expiresAt = new Date(beg.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}

/**
 * Users may withdraw donations once a request is fully funded or after it expires.
 * Only amounts actually raised are withdrawable (partial funding on expiry is allowed).
 */
export function isBegWithdrawable(beg: WithdrawableBegFields): boolean {
  const raised = Number(beg.amountRaised);
  if (!Number.isFinite(raised) || raised <= 0) return false;
  if (beg.status === 'cancelled' || beg.status === 'rejected' || beg.status === 'flagged') {
    return false;
  }
  if (beg.status === 'funded') return true;
  return isBegRequestPeriodEnded(beg);
}

export function begRaisedAmount(beg: Pick<BegFeedItem, 'amountRaised'>): number {
  return Math.round(Number(beg.amountRaised) || 0);
}

export function begFundingProgress(beg: Pick<BegFeedItem, 'amountRaised' | 'amountRequested'>): number {
  const raised = begRaisedAmount(beg);
  const goal = Math.round(Number(beg.amountRequested) || 0);
  if (goal <= 0) return 1;
  return Math.min(1, raised / goal);
}
