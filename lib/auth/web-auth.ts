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
  const match = cookie
    .split('; ')
    .find((row) => row.startsWith(prefix));

  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return match.slice(prefix.length);
  }
}

export function getRefreshCookieCsrfToken(): string | null {
  return getWebCookie('pliz_csrf');
}
