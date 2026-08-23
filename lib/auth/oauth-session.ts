import type { OAuthLoginSuccessData } from '@/lib/api/types';
import { setTokens } from '@/lib/auth/access-token';
import { resetSessionRecoveryState } from '@/lib/auth/session-expired';
import { enterAuthenticatedApp } from '@/lib/navigation/auth-navigation';

/**
 * Store tokens, refresh `/me`, and enter the app (profile completion deferred until needed).
 */
export async function applyOAuthLoginResult(
  result: OAuthLoginSuccessData,
  refreshUser: () => Promise<void>
): Promise<void> {
  await setTokens(result.accessToken, result.refreshToken);
  resetSessionRecoveryState();
  await refreshUser();
  enterAuthenticatedApp('/(tabs)/(main)' as import('expo-router').Href);
}
