import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getUserAdminChats } from '@/lib/api/admin-chat';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';

function sumUnreadSupportMessages(
  chats: Awaited<ReturnType<typeof getUserAdminChats>>
): number {
  return chats.reduce((total, chat) => total + (chat.unreadCount ?? 0), 0);
}

/**
 * Unread admin support chat messages for the floating chat button badge.
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
        const chats = await getUserAdminChats(token);
        return sumUnreadSupportMessages(chats);
      } catch (e) {
        if (isUnauthorizedSessionError(e)) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            const token2 = await getAccessToken();
            if (token2) {
              const chats = await getUserAdminChats(token2);
              return sumUnreadSupportMessages(chats);
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
