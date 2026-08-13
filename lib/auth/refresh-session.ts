import { refreshAccessToken } from '@/lib/api/auth';

import { getAccessToken, getRefreshToken, setTokens } from './access-token';
import { isWebAuthEnvironment, clearStaleHostOnlyAuthCookies } from '@/lib/auth/web-auth';

const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

function getJwtExpiryMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

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
      const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(rt);
      if (!newRefreshToken) {
        refreshFailedUntil = Date.now() + FAILED_REFRESH_COOLDOWN_MS;
        return false;
      }
      await setTokens(accessToken, newRefreshToken);
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

/**
 * Proactively refresh before the access JWT expires (native). No-op on web or when logged out.
 */
export async function refreshSessionIfNeeded(): Promise<void> {
  if (isWebAuthEnvironment()) {
    return;
  }

  const rt = await getRefreshToken();
  if (!rt?.trim()) {
    return;
  }

  const access = await getAccessToken();
  if (!access) {
    await tryRefreshAccessToken();
    return;
  }

  const expMs = getJwtExpiryMs(access);
  if (expMs === null || expMs - Date.now() <= REFRESH_BEFORE_EXPIRY_MS) {
    await tryRefreshAccessToken();
  }
}
