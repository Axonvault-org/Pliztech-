import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupportUnreadCount } from '@/lib/api/admin-chat';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';

/**
 * Unread support inbox items (direct chats + broadcast announcements) for the FAB badge.
 */
export function useUnreadSupportMessageCount() {
  const { user, signOut } = useCurrentUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.supportUnreadCount,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return 0;
      try {
        const counts = await getSupportUnreadCount(token);
        return counts.total;
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              const counts = await getSupportUnreadCount(token2);
              return counts.total;
            }
          }
        }
        return 0;
      }
    },
    enabled: Boolean(user?.id),
    staleTime: STALE_TIMES.unreadCount,
    refetchOnWindowFocus: true,
  });

  return {
    unreadCount: query.data ?? 0,
    refreshUnreadSupportCount: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.supportUnreadCount }),
  };
}
