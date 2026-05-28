import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/lib/query/query-keys';

/** Invalidate cached home / user data after donations, profile edits, etc. */
export function useInvalidateAppQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    async (scope: 'donation' | 'profile' | 'all' = 'all') => {
      const tasks: Promise<void>[] = [];

      if (scope === 'donation' || scope === 'all') {
        tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.me }));
        tasks.push(
          queryClient.invalidateQueries({ queryKey: ['donations', 'mine'] })
        );
        tasks.push(queryClient.invalidateQueries({ queryKey: ['begs'] }));
      }

      if (scope === 'profile' || scope === 'all') {
        tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.me }));
        tasks.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.profilePicture })
        );
      }

      await Promise.all(tasks);
    },
    [queryClient]
  );
}
