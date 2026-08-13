import type { ActivityRequestStatus } from '@/lib/types/activity';

/** Minimal beg fields needed for donation / activity status (avoids api/beg import cycle). */
export type BegStatusInput = {
  approved: boolean;
  status: string;
  isWithdrawn?: boolean;
  amountRequested: number | string;
  amountRaised: number | string;
  timeRemaining?: string;
};

export function mapBegStatusToActivityStatus(beg: BegStatusInput): ActivityRequestStatus {
  const s = beg.status;
  if (s === 'funded') return 'funded';
  if (s === 'withdrawn' || (beg.isWithdrawn && s === 'expired')) return 'withdrawn';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'expired') return 'expired';
  if (s === 'rejected') return 'rejected';
  if (!beg.approved) return 'pending';

  if (s === 'flagged') return 'flagged';

  const goal = Math.round(Number(beg.amountRequested) || 0);
  const raised = Math.round(Number(beg.amountRaised) || 0);
  if (goal > 0 && raised >= goal) return 'funded';
  if (beg.timeRemaining === 'Expired') return 'expired';

  return 'active';
}

/** After a donation, use Activity “past request” overlay when the beg is no longer active. */
export function isBegPastOrClosedForDonorNav(beg: BegStatusInput): boolean {
  if (beg.isWithdrawn) return true;
  const st = mapBegStatusToActivityStatus(beg);
  return st !== 'active' && st !== 'pending';
}

/** Whether a feed beg is open for new donations from other users. */
export function begAcceptsDonations(beg: BegStatusInput): boolean {
  if (!beg.approved) return false;
  return !isBegPastOrClosedForDonorNav(beg);
}
