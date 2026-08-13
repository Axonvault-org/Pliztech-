import { useQuery } from '@tanstack/react-query';

import { getHiddenBegs } from '@/lib/api/beg';
import { getBlockedUsers } from '@/lib/api/blocks';
import { getAccessToken } from '@/lib/auth/access-token';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';

async function loadHiddenBegIds(): Promise<Set<string>> {
  const token = await getAccessToken();
  if (!token) return new Set();

  const result = await getHiddenBegs(token, 1, 200);
  return new Set(result.hiddenBegs.map((row) => row.id));
}

async function loadBlockedUserIds(): Promise<Set<string>> {
  const token = await getAccessToken();
  if (!token) return new Set();

  const result = await getBlockedUsers(token, 1, 200);
  return new Set(result.blockedUsers.map((row) => row.id));
}

/** Hidden beg IDs and blocked user IDs for the signed-in viewer. */
export function useUserSafetySets() {
  const hiddenQuery = useQuery({
    queryKey: queryKeys.hiddenBegIds,
    queryFn: loadHiddenBegIds,
    staleTime: STALE_TIMES.begsFeed,
  });

  const blockedQuery = useQuery({
    queryKey: queryKeys.blockedUserIds,
    queryFn: loadBlockedUserIds,
    staleTime: STALE_TIMES.begsFeed,
  });

  return {
    hiddenBegIds: hiddenQuery.data ?? new Set<string>(),
    blockedUserIds: blockedQuery.data ?? new Set<string>(),
    isLoading: hiddenQuery.isLoading || blockedQuery.isLoading,
  };
}
