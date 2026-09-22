import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

import type { MeUser } from '@/lib/api/types';
import {
  BEG_TIER1_MAX_AMOUNT_NGN,
  getDonationRequestBlockReason,
} from '@/lib/user/request-readiness';

/** Query param: user started profile/KYC from the create-request screen. */
export const REQUEST_FLOW_RETURN_TO = 'create-request';

const CREATE_REQUEST_PATH = '/(tabs)/(main)/create';
const BROWSE_PATH = '/(tabs)/(main)/browse';
const KYC_PATH = '/(tabs)/kyc-verification';
const KYC_COMPLETE_PATH = '/(tabs)/kyc-verification-complete';
const SIGNUP_PROFILE_PATH = '/(auth)/signup-profile';

function parseAmountParam(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function flowParamsForCreateRequest(
  amountRequestedNgn?: number
): Record<string, string> {
  const params: Record<string, string> = { returnTo: REQUEST_FLOW_RETURN_TO };
  if (amountRequestedNgn != null && Number.isFinite(amountRequestedNgn)) {
    params.amountRequested = String(Math.round(amountRequestedNgn));
  }
  return params;
}

export function signupProfileHrefForCreateRequest(amountRequestedNgn?: number): Href {
  return {
    pathname: SIGNUP_PROFILE_PATH,
    params: flowParamsForCreateRequest(amountRequestedNgn),
  } as Href;
}

export function kycHrefForCreateRequest(amountRequestedNgn?: number): Href {
  return {
    pathname: KYC_PATH,
    params: flowParamsForCreateRequest(amountRequestedNgn),
  } as Href;
}

export function browseHrefForCreateRequest(amountRequestedNgn?: number): Href {
  return {
    pathname: BROWSE_PATH,
    params: flowParamsForCreateRequest(amountRequestedNgn),
  } as Href;
}

export function kycCompleteHrefForCreateRequest(amountRequestedNgn?: number): Href {
  return {
    pathname: KYC_COMPLETE_PATH,
    params: flowParamsForCreateRequest(amountRequestedNgn),
  } as Href;
}

export function createRequestHref(options?: {
  amountRequestedNgn?: number;
  profileCompleted?: boolean;
}): Href {
  const params: Record<string, string> = { returnTo: REQUEST_FLOW_RETURN_TO };
  if (options?.amountRequestedNgn != null) {
    params.amountRequested = String(Math.round(options.amountRequestedNgn));
  }
  if (options?.profileCompleted) {
    params.profileCompleted = '1';
  }
  return { pathname: CREATE_REQUEST_PATH, params } as Href;
}

export function isCreateRequestFlow(returnTo: string | undefined): boolean {
  return returnTo === REQUEST_FLOW_RETURN_TO;
}

let pendingProfileCompletedNotice = false;

/** Create screen reads this on focus after profile completion pops back. */
export function consumeProfileCompletedNotice(): boolean {
  const pending = pendingProfileCompletedNotice;
  pendingProfileCompletedNotice = false;
  return pending;
}

function returnToCreateRequest(amountRequested: string | undefined, profileCompleted: boolean): void {
  if (profileCompleted) {
    pendingProfileCompletedNotice = true;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  const amount = parseAmountParam(amountRequested);
  router.replace(
    createRequestHref({
      amountRequestedNgn: amount,
      profileCompleted,
    })
  );
}

/** Back from complete profile (or KYC) toward the request the user was making. */
export function exitToCreateRequestFlow(amountRequested?: string): void {
  returnToCreateRequest(amountRequested, false);
}

/**
 * After profile is saved during a request: confirm success and route to KYC or back to create.
 */
export function continueAfterProfileCompleteForRequestFlow(
  user: MeUser | null,
  amountRequested?: string
): void {
  const amount = parseAmountParam(amountRequested);
  const block = getDonationRequestBlockReason(user, amount);

  if (block === 'verification') {
    Alert.alert(
      'Profile complete',
      `Your profile is saved. Requests over ₦${BEG_TIER1_MAX_AMOUNT_NGN.toLocaleString('en-NG')} require identity verification before you can submit.`,
      [
        {
          text: 'Verify identity',
          onPress: () => router.replace(kycHrefForCreateRequest(amount)),
        },
      ],
      { cancelable: false }
    );
    return;
  }

  Alert.alert(
    'Profile complete',
    'Your profile is saved. You can continue with your donation request.',
    [
      {
        text: 'Continue request',
        onPress: () => returnToCreateRequest(amountRequested, true),
      },
    ],
    { cancelable: false }
  );
}
