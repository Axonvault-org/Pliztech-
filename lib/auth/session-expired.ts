import type { Href } from 'expo-router';

import { PlizApiError } from '@/lib/api/types';

import { enterLogin } from '@/lib/navigation/auth-navigation';

import { getAccessToken } from './access-token';
import { resetRefreshCooldown, tryRefreshAccessToken } from './refresh-session';

const LOGIN_SESSION_EXPIRED = '/(auth)/login?session=expired' as Href;

/** True when the API rejected the Bearer token (expired, invalid, or revoked). */
export function isUnauthorizedSessionError(error: unknown): boolean {
  return error instanceof PlizApiError && error.status === 401;
}

let logoutAndGoToLoginPromise: Promise<void> | null = null;

/**
 * Clears the local session (via `signOut` from `CurrentUserProvider`) and opens the login screen
 * with a query flag so we can show a session-expired notice.
 */
export async function logoutAndGoToLogin(signOut: () => Promise<void>): Promise<void> {
  if (logoutAndGoToLoginPromise) {
    return logoutAndGoToLoginPromise;
  }

  logoutAndGoToLoginPromise = (async () => {
    try {
      await signOut();
      enterLogin(LOGIN_SESSION_EXPIRED);
    } finally {
      logoutAndGoToLoginPromise = null;
    }
  })();

  return logoutAndGoToLoginPromise;
}

/** Set after refresh fails so we do not run multiple sign-outs for the same expired session. */
let sessionHardInvalid = false;

let sessionRecoveryPromise: Promise<boolean> | null = null;

/**
 * Call after a successful login (tokens persisted) so 401 recovery can run again.
 */
export function resetSessionRecoveryState(): void {
  sessionHardInvalid = false;
  resetRefreshCooldown();
}

/**
 * On access-token 401: call `/api/auth/refresh-token` once (deduped). If that succeeds, returns
 * `true` so the caller can retry with `getAccessToken()`. If refresh fails, signs out and navigates
 * to login with the session-expired notice once (parallel 401s share this flow).
 */
export async function recoverFromUnauthorized(
  signOut: () => Promise<void>
): Promise<boolean> {
  if (sessionHardInvalid) {
    return false;
  }
  if (sessionRecoveryPromise) {
    return sessionRecoveryPromise;
  }

  sessionRecoveryPromise = (async (): Promise<boolean> => {
    try {
      const ok = await tryRefreshAccessToken();
      if (ok) {
        return true;
      }
      sessionHardInvalid = true;
      await logoutAndGoToLogin(signOut);
      return false;
    } finally {
      sessionRecoveryPromise = null;
    }
  })();

  return sessionRecoveryPromise;
}

/**
 * Returns stored access token, or tries a refresh once when missing (e.g. memory cleared but refresh
 * cookie / SecureStore still has a refresh token).
 */
export async function getAccessTokenOrTryRefresh(): Promise<string | null> {
  let token = await getAccessToken();
  if (!token) {
    const ok = await tryRefreshAccessToken();
    if (ok) {
      token = await getAccessToken();
    }
  }
  return token;
}

/**
 * Runs an authenticated API call. On 401, attempts refresh once and retries with the new access
 * token. If there is no token and refresh cannot produce one, throws `PlizApiError` 401.
 */
export async function withUnauthorizedRecovery<T>(
  signOut: () => Promise<void>,
  request: (accessToken: string) => Promise<T>
): Promise<T> {
  let token = await getAccessTokenOrTryRefresh();
  if (!token) {
    throw new PlizApiError('Please sign in again.', 401);
  }
  try {
    return await request(token);
  } catch (e) {
    if (!isUnauthorizedSessionError(e)) {
      throw e;
    }
    const recovered = await recoverFromUnauthorized(signOut);
    if (!recovered) {
      throw e;
    }
    token = await getAccessToken();
    if (!token) {
      throw e;
    }
    return await request(token);
  }
}
