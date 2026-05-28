import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';

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

/** Whether user may request more than ₦10k (verified + at least 1 donation). */
export function canRequestHighAmountBeg(user: MeUser | null): boolean {
  if (!user) return false;
  const isVerified = Boolean(user.verification?.isVerified);
  const hasDonated = (Number(user.stats?.totalDonated) || 0) > 0;
  return isVerified && hasDonated;
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
  const queryClient = useQueryClient();
  const signOutInFlight = useRef<Promise<void> | null>(null);

  const signOut = useCallback(async () => {
    if (signOutInFlight.current) {
      return signOutInFlight.current;
    }

    signOutInFlight.current = (async () => {
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
      queryClient.setQueryData(queryKeys.me, null);
      queryClient.removeQueries({ queryKey: queryKeys.me });
    })().finally(() => {
      signOutInFlight.current = null;
    });

    return signOutInFlight.current;
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<MeUser | null> => {
      let token = await getAccessToken();
      if (!token) {
        await tryRefreshAccessToken();
        token = await getAccessToken();
      }
      if (!token) return null;

      try {
        return await getMe(token);
      } catch (e) {
        if (e instanceof PlizApiError && e.status === 401) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              return getMe(token2);
            }
          }
          await logoutAndGoToLogin(signOut);
          return null;
        }
        throw e;
      }
    },
    staleTime: STALE_TIMES.me,
    retry: false,
  });

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    await queryClient.fetchQuery({ queryKey: queryKeys.me });
  }, [queryClient]);

  const user = meQuery.data ?? null;
  const isLoading = meQuery.isLoading && user == null;
  const error =
    meQuery.error instanceof Error
      ? meQuery.error.message
      : meQuery.error
        ? 'Failed to load user'
        : null;

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
