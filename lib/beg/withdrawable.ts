import type { BegFeedItem } from '@/lib/api/beg';

type WithdrawableBegFields = Pick<
  BegFeedItem,
  'status' | 'expiresAt' | 'amountRaised' | 'amountRequested' | 'isWithdrawn' | 'approved'
>;

/** True when the request is fully funded or its expiry time has passed. */
export function isBegRequestPeriodEnded(
  beg: Pick<BegFeedItem, 'status' | 'expiresAt'>
): boolean {
  if (beg.status === 'funded' || beg.status === 'expired') return true;
  const expiresAt = new Date(beg.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}

/** Active request that still has time left and has not reached its goal. */
export function isBegActiveForWithdrawNow(
  beg: Pick<BegFeedItem, 'status' | 'expiresAt' | 'amountRaised' | 'amountRequested'>
): boolean {
  if (beg.status !== 'active') return false;
  if (isBegRequestPeriodEnded(beg)) return false;
  const raised = begRaisedAmount(beg);
  const goal = Math.round(Number(beg.amountRequested) || 0);
  return goal <= 0 || raised < goal;
}

/**
 * Owners may withdraw donations once they have received at least one.
 * Withdrawing while still active ends the request and stops further donations.
 */
export function isBegWithdrawable(beg: WithdrawableBegFields): boolean {
  const raised = Number(beg.amountRaised);
  if (!Number.isFinite(raised) || raised <= 0) return false;
  if (beg.isWithdrawn) return false;
  if (beg.approved === false) return false;
  if (beg.status === 'cancelled' || beg.status === 'rejected' || beg.status === 'flagged') {
    return false;
  }
  if (beg.status === 'withdrawn') return false;
  return ['active', 'funded', 'expired'].includes(beg.status);
}

/** Step-1 list label for a withdrawable request. */
export function begWithdrawListStatusLabel(
  beg: Pick<BegFeedItem, 'status' | 'expiresAt' | 'amountRaised' | 'amountRequested'>
): string {
  const raised = begRaisedAmount(beg);
  const goal = Math.round(Number(beg.amountRequested) || 0);
  const isFullyFunded = beg.status === 'funded' || (goal > 0 && raised >= goal);
  if (isFullyFunded) return 'Fully funded';
  if (isBegActiveForWithdrawNow(beg)) return 'Withdraw now';
  if (isBegRequestPeriodEnded(beg)) return 'Expired · Withdrawable';
  return 'Withdrawable';
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
