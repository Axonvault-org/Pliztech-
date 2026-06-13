import { refreshAccessToken } from '@/lib/api/auth';

import { getRefreshToken, setTokens } from './access-token';
import { isWebAuthEnvironment, clearStaleHostOnlyAuthCookies } from '@/lib/auth/web-auth';

/** Single in-flight refresh so concurrent 401s share one token rotation. */
let refreshPromise: Promise<boolean> | null = null;

/** After a failed refresh, avoid hammering `/refresh-token` until cooldown elapses. */
let refreshFailedUntil = 0;
const FAILED_REFRESH_COOLDOWN_MS = 3000;

export function resetRefreshCooldown(): void {
  refreshFailedUntil = 0;
}

/**
 * Uses stored refresh token to obtain a new access token and persists both.
 * @returns true if a new access token was stored; false if no refresh token or refresh failed.
 */
export function tryRefreshAccessToken(): Promise<boolean> {
  if (Date.now() < refreshFailedUntil) {
    return Promise.resolve(false);
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async (): Promise<boolean> => {
    try {
      if (isWebAuthEnvironment()) {
        clearStaleHostOnlyAuthCookies();
        const { accessToken } = await refreshAccessToken();
        await setTokens(accessToken, '');
        refreshFailedUntil = 0;
        return true;
      }
      const rt = await getRefreshToken();
      if (!rt?.trim()) {
        refreshFailedUntil = Date.now() + FAILED_REFRESH_COOLDOWN_MS;
        return false;
      }
      const { accessToken } = await refreshAccessToken(rt);
      await setTokens(accessToken, rt);
      refreshFailedUntil = 0;
      return true;
    } catch {
      refreshFailedUntil = Date.now() + FAILED_REFRESH_COOLDOWN_MS;
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
