import type { MeUser } from '@/lib/api/types';

/**
 * Mirrors backend `BegService.checkTierProgression` error messages
 * (pliz-backend/src/modules/Beg/services/beg.service.ts).
 */
export function getBegAmountTierError(
  requestedAmount: number,
  user: MeUser | null
): string | null {
  if (!Number.isFinite(requestedAmount)) return null;

  if (requestedAmount > 200_000) {
    return 'The maximum request amount is ₦200,000 during our current phase.';
  }

  if (requestedAmount <= 10_000) {
    return null;
  }

  const isVerified = Boolean(user?.verification?.isVerified);
  const totalDonated = Number(user?.stats?.totalDonated) || 0;
  const hasDonated = totalDonated > 0;

  if (requestedAmount > 10_000) {
    if (!isVerified && !hasDonated) {
      return 'To request more than ₦10,000 you need to verify your identity and make at least 1 donation.';
    }
    if (!isVerified) {
      return 'To request more than ₦10,000 you must complete your identity verification.';
    }
    if (!hasDonated) {
      return 'To request more than ₦10,000 you must make at least 1 donation first.';
    }
  }

  if (requestedAmount > 50_000) {
    if (totalDonated < 10_000) {
      const donated = totalDonated.toLocaleString();
      return `To request more than ₦50,000 you must have donated at least ₦10,000 in total. You have donated ₦${donated} so far.`;
    }
  }

  if (requestedAmount > 100_000) {
    if (totalDonated < 50_000) {
      const donated = totalDonated.toLocaleString();
      return `To request more than ₦100,000 you must have donated at least ₦50,000 in total. You have donated ₦${donated} so far.`;
    }
  }

  return null;
}

export function parseAmountInput(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
