import {
  getKycStatus,
  resetKycAfterRejection,
  submitKyc,
  type KycVerificationRecord,
} from '@/lib/api/kyc';
import { PlizApiError } from '@/lib/api/types';

export type KycSubmitOutcome =
  | { kind: 'verified'; verification: KycVerificationRecord }
  | { kind: 'rejected'; verification: KycVerificationRecord; reason: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reset a rejected verification so the user can upload and submit again. */
export async function ensureKycReadyForResubmit(accessToken: string): Promise<void> {
  const payload = await getKycStatus(accessToken);
  if (payload.verification?.status === 'rejected' && payload.canRetry) {
    await resetKycAfterRejection(accessToken);
  }
}

/**
 * POST /api/kyc/submit then poll until Prembly finishes (verified or rejected).
 */
export async function submitAndWaitForKycResult(
  accessToken: string,
  options?: { maxWaitMs?: number; intervalMs?: number }
): Promise<KycSubmitOutcome> {
  const maxWaitMs = options?.maxWaitMs ?? 60_000;
  const intervalMs = options?.intervalMs ?? 2_000;

  await submitKyc(accessToken);

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const payload = await getKycStatus(accessToken);
    const verification = payload.verification;
    if (!verification) {
      throw new PlizApiError('Verification record not found.', 404);
    }

    if (verification.isVerified || verification.status === 'verified') {
      return { kind: 'verified', verification };
    }

    if (verification.status === 'rejected') {
      return {
        kind: 'rejected',
        verification,
        reason:
          verification.rejectionReason?.trim() ||
          'Verification failed. Please check your details and try again.',
      };
    }

    await sleep(intervalMs);
  }

  throw new PlizApiError(
    'Verification is still processing. Check your profile in a moment for the result.',
    408
  );
}
