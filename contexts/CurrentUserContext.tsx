import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getMe,
  invalidateRefreshCookie,
  logout as logoutApi,
} from '@/lib/api/auth';
import { PlizApiError, type MeUser } from '@/lib/api/types';
import { clearTokens, getAccessToken } from '@/lib/auth/access-token';
import { tryRefreshAccessToken } from '@/lib/auth/refresh-session';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';
import {
  logoutAndGoToLogin,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

export function displayFirstName(user: MeUser | null): string {
  if (!user) return '';
  const fromProfile = user.profile?.firstName?.trim();
  if (fromProfile) return fromProfile;
  return user.username?.trim() || 'there';
}

export function displayRoleLabel(role: string): string {
  switch (role) {
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'user':
    default:
      return 'Community Supporter';
  }
}

/**
 * Member-facing role on profile: "Beginner" until first donation, then "Community Supporter".
 * Admins keep admin labels.
 */
export function displayMemberRoleLabel(user: MeUser | null): string {
  if (!user) return 'Member';
  if (user.role === 'admin' || user.role === 'superadmin') {
    return displayRoleLabel(user.role);
  }
  const donated = Number(user.stats?.totalDonated) || 0;
  return donated > 0 ? 'Community Supporter' : 'Beginner';
}

/** Govt ID verified (NIN / passport). Prefer final `isVerified`, fall back to document state for older API builds. */
export function isDocumentVerified(user: MeUser | null): boolean {
  return Boolean(user?.verification?.isVerified ?? user?.verification?.documentVerified);
}

/**
 * Whether user may request more than ₦10k (gov ID + at least 2 successful begs or any donation).
 * Matches product rule approximately until GET /me includes explicit flags.
 */
export function canRequestHighAmountBeg(user: MeUser | null): boolean {
  if (!user) return false;
  if (!isDocumentVerified(user)) return false;
  const stats = user.stats;
  const reqs = stats?.requestsCount ?? 0;
  const donated = Number(stats?.totalDonated) || 0;
  return reqs >= 2 || donated > 0;
}

/** Header name + email respecting anonymous mode (hides PII). */
export function displayProfileHeader(user: MeUser | null): {
  name: string;
  email: string;
  initials: string;
  maskAvatar: boolean;
} {
  if (!user?.profile) {
    return {
      name: user?.username?.trim() || 'Member',
      email: user?.email ?? '',
      initials: initialsFromDisplayName(user?.username ?? '?'),
      maskAvatar: false,
    };
  }
  if (user.profile.isAnonymous) {
    const dn = user.profile.displayName?.trim() || 'Anonymous';
    return {
      name: dn,
      email: '',
      initials: '?',
      maskAvatar: true,
    };
  }
  const full = displayFullName(user);
  return {
    name: full,
    email: user.email ?? '',
    initials: initialsFromDisplayName(full),
    maskAvatar: false,
  };
}

/** Throttle for refetching `/me` when tab screens gain focus (shared with Home / Profile). */
export const CURRENT_USER_FOCUS_REFETCH_STALE_MS = 2 * 60 * 1000;

/** Full display name: first + last name only (no middle, displayName, etc.) */
export function displayFullName(user: MeUser | null): string {
  if (!user) return '';
  const p = user.profile;
  if (p) {
    const first = p.firstName?.trim() ?? '';
    const last = p.lastName?.trim() ?? '';
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
  }
  return user.username?.trim() || 'Member';
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? '?';
}

export function avatarColorFromSeed(seed: string): string {
  const palette = ['#2E8BEA', '#EF4444', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  return palette[Math.abs(h) % palette.length]!;
}

type CurrentUserContextValue = {
  user: MeUser | null;
  /** True while resolving the session when there is no cached user yet. Background `/me` refetches do not flip this (avoids unmounting tabs + request loops). */
  isLoading: boolean;
  error: string | null;
  /** Call after login, logout, or profile updates. Deduplicates concurrent calls. */
  refreshUser: () => Promise<void>;
  /** Clear stored tokens and user state (does not navigate). */
  signOut: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSeq = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const signOutInFlight = useRef<Promise<void> | null>(null);
  /** Latest user for refresh logic (avoids stale closure). */
  const userRef = useRef<MeUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const signOut = useCallback(async () => {
    if (signOutInFlight.current) {
      return signOutInFlight.current;
    }

    signOutInFlight.current = (async () => {
      fetchSeq.current += 1;
      const token = await getAccessToken();
      try {
        if (token) {
          await logoutApi(token);
        } else if (isWebAuthEnvironment()) {
          await invalidateRefreshCookie();
        }
      } catch {
        if (isWebAuthEnvironment()) {
          try {
            await invalidateRefreshCookie();
          } catch {
            /* ignore */
          }
        }
      }
      await clearTokens();
      setUser(null);
      setError(null);
      setIsLoading(false);
    })().finally(() => {
      signOutInFlight.current = null;
    });

    return signOutInFlight.current;
  }, []);

  const refreshUser = useCallback(async () => {
    if (inFlight.current) {
      return inFlight.current;
    }

    const run = async () => {
      const seq = ++fetchSeq.current;
      const hadUserAlready = userRef.current != null;
      setError(null);

      let token = await getAccessToken();
      if (!token) {
        await tryRefreshAccessToken();
        token = await getAccessToken();
      }
      if (!token) {
        if (seq === fetchSeq.current) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      /** Only show global session loading when we don't have a user yet — not on background refetch (prevents tabs stack unmount → remount → focus refetch loop and 429s). */
      let didSetBlockingLoad = false;
      if (seq === fetchSeq.current && !hadUserAlready) {
        setIsLoading(true);
        didSetBlockingLoad = true;
      }

      try {
        const me = await getMe(token);
        if (seq === fetchSeq.current) {
          setUser(me);
        }
      } catch (e) {
        if (e instanceof PlizApiError && e.status === 401) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered && seq === fetchSeq.current) {
            const token2 = await getAccessToken();
            if (token2) {
              try {
                const me = await getMe(token2);
                if (seq === fetchSeq.current) {
                  setUser(me);
                }
              } catch (e2) {
                if (e2 instanceof PlizApiError && e2.status === 401) {
                  await logoutAndGoToLogin(signOut);
                } else if (seq === fetchSeq.current) {
                  setError(e2 instanceof Error ? e2.message : 'Failed to load user');
                  setUser(null);
                }
              }
            } else {
              await logoutAndGoToLogin(signOut);
            }
          }
        } else if (seq === fetchSeq.current) {
          setError(e instanceof Error ? e.message : 'Failed to load user');
          setUser(null);
        }
      } finally {
        if (seq === fetchSeq.current && didSetBlockingLoad) {
          setIsLoading(false);
        }
      }
    };

    inFlight.current = run().finally(() => {
      inFlight.current = null;
    });

    return inFlight.current;
  }, [signOut]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      isLoading,
      error,
      refreshUser,
      signOut,
    }),
    [user, isLoading, error, refreshUser, signOut]
  );

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}
