import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { MeUser } from '@/lib/api/types';
import {
  kycHrefForCreateRequest,
  signupProfileHrefForCreateRequest,
} from '@/lib/navigation/donation-request-flow';
import {
  BEG_TIER1_MAX_AMOUNT_NGN,
  getDonationRequestBlockReason,
} from '@/lib/user/request-readiness';

/**
 * Returns true when the user may proceed with donation request submission.
 * Otherwise shows a contextual alert with a path to complete requirements.
 */
export function promptDonationRequestReadiness(
  user: MeUser | null,
  amountRequestedNgn?: number
): boolean {
  const block = getDonationRequestBlockReason(user, amountRequestedNgn);
  if (!block) return true;

  if (block === 'profile') {
    Alert.alert(
      'Complete your profile',
      'Add your personal details before submitting a donation request.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Complete profile',
          onPress: () =>
            router.push(signupProfileHrefForCreateRequest(amountRequestedNgn)),
        },
      ]
    );
    return false;
  }

  Alert.alert(
    'Verify your identity',
    `Requests over ₦${BEG_TIER1_MAX_AMOUNT_NGN.toLocaleString('en-NG')} require identity verification. Verify your account to continue — it helps keep donors safe.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Verify now',
        onPress: () => router.push(kycHrefForCreateRequest(amountRequestedNgn)),
      },
    ]
  );
  return false;
}
