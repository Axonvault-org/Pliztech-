import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getUnreadNotificationCount } from '@/lib/api/notifications';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

/**
 * Shared unread badge query — deduplicated across all headers via React Query.
 */
export function useUnreadNotificationCount() {
  const { signOut } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return 0;
      try {
        return await getUnreadNotificationCount(token);
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              return getUnreadNotificationCount(token2);
            }
          }
        }
        return 0;
      }
    },
    staleTime: STALE_TIMES.unreadCount,
  });

  return {
    unreadCount: query.data ?? 0,
    refreshUnreadCount: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
  };
}
