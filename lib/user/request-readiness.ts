import type { MeUser } from '@/lib/api/types';

function isIdentityVerified(user: MeUser | null): boolean {
  return Boolean(user?.verification?.isVerified ?? user?.verification?.documentVerified);
}

export function needsProfileCompletion(user: MeUser | null): boolean {
  return Boolean(user && !user.isProfileComplete);
}

/** PLZ-23: requesters need profile + identity verification before submitting a beg. */
export function canSubmitDonationRequest(user: MeUser | null): boolean {
  if (!user?.isProfileComplete) return false;
  return isIdentityVerified(user);
}

export type DonationRequestBlockReason = 'profile' | 'verification';

export function getDonationRequestBlockReason(
  user: MeUser | null
): DonationRequestBlockReason | null {
  if (needsProfileCompletion(user)) return 'profile';
  if (!isIdentityVerified(user)) return 'verification';
  return null;
}
