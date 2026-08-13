/**
 * True when running in a browser (Expo web). React Native has no `document`.
 * Used so auth fetches use `credentials: 'include'` and httpOnly cookies reliably.
 */
export function isWebAuthEnvironment(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { document?: unknown }).document !== 'undefined' &&
    (globalThis as { document?: unknown }).document != null
  );
}

export function getWebCookie(name: string): string | null {
  if (!isWebAuthEnvironment()) return null;

  const cookie = (globalThis as { document?: { cookie?: string } }).document?.cookie;
  if (!cookie) return null;

  const prefix = `${name}=`;
  const matches = cookie.split('; ').filter((row) => row.startsWith(prefix));
  if (matches.length === 0) return null;

  // If duplicate names exist (legacy host + .plz.ng), prefer the last entry.
  const match = matches[matches.length - 1]!;

  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return match.slice(prefix.length);
  }
}

/**
 * Drop host-only auth cookies on the current web origin (e.g. app-staging.plz.ng).
 * Shared cookies use Domain=.plz.ng and remain. Call once on web boot before refresh.
 */
export function clearStaleHostOnlyAuthCookies(): void {
  if (!isWebAuthEnvironment()) return;

  const secure = globalThis.location?.protocol === 'https:';
  const secureAttr = secure ? '; Secure' : '';
  const sameSite = secure ? '; SameSite=None' : '; SameSite=Lax';

  globalThis.document.cookie = `pliz_csrf=; Max-Age=0; path=/${secureAttr}${sameSite}`;
}

export function getRefreshCookieCsrfToken(): string | null {
  return getWebCookie('pliz_csrf');
}
