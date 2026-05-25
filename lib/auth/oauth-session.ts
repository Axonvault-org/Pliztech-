import type { OAuthLoginSuccessData } from '@/lib/api/types';
import { setTokens } from '@/lib/auth/access-token';
import { resetSessionRecoveryState } from '@/lib/auth/session-expired';
import {
  enterAuthenticatedApp,
  enterSignupProfile,
} from '@/lib/navigation/auth-navigation';

/**
 * Store tokens, refresh `/me`, and route per API `nextStep` / profile completion.
 */
export async function applyOAuthLoginResult(
  result: OAuthLoginSuccessData,
  refreshUser: () => Promise<void>
): Promise<void> {
  await setTokens(result.accessToken, result.refreshToken);
  resetSessionRecoveryState();
  await refreshUser();
  if (result.nextStep === 'complete_profile' || !result.user.isProfileComplete) {
    enterSignupProfile();
  } else {
    enterAuthenticatedApp('/(tabs)' as import('expo-router').Href);
  }
}
