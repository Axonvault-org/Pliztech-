import { useQuery } from '@tanstack/react-query';

import { getTrendingBegs } from '@/lib/api/beg';
import {
  getMyDonations,
  myDonationToRecentContribution,
} from '@/lib/api/donations';
import { getProfilePicture } from '@/lib/api/profile-picture';
import { PlizApiError } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';
import type { RecentContribution } from '@/lib/types/home';

export function useTrendingBegsQuery(limit = 5) {
  return useQuery({
    queryKey: queryKeys.trendingBegs(limit),
    queryFn: () => getTrendingBegs(limit),
    staleTime: STALE_TIMES.begsFeed,
  });
}

export function useRecentContributionsQuery(limit = 5, signOut: () => Promise<void>) {
  return useQuery({
    queryKey: queryKeys.myDonations({ page: 1, limit }),
    queryFn: async (): Promise<RecentContribution[]> => {
      const token = await getAccessToken();
      if (!token) return [];

      try {
        const result = await getMyDonations(token, { page: 1, limit });
        return result.donations.map(myDonationToRecentContribution);
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              const result = await getMyDonations(token2, { page: 1, limit });
              return result.donations.map(myDonationToRecentContribution);
            }
          }
        }
        if (e instanceof PlizApiError) throw e;
        throw e instanceof Error ? e : new Error('Could not load contributions');
      }
    },
    staleTime: STALE_TIMES.myDonations,
  });
}

export function useProfilePictureQuery(signOut: () => Promise<void>) {
  return useQuery({
    queryKey: queryKeys.profilePicture,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return null;

      try {
        return await getProfilePicture(token);
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              return getProfilePicture(token2);
            }
          }
        }
        return null;
      }
    },
    staleTime: STALE_TIMES.profilePicture,
  });
}
