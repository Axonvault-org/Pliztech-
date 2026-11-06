import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getBegById, type BegFeedItem } from '@/lib/api/beg';
import { getBegDonations, type GetBegDonationsResult } from '@/lib/api/donations';
import { PlizApiError } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import { findBegInFeedCache } from '@/lib/query/beg-feed-cache';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';

function queryRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof PlizApiError && error.status === 429) {
    return failureCount < 3;
  }
  return failureCount < 1;
}

function queryRetryDelay(attemptIndex: number, error: unknown): number {
  if (error instanceof PlizApiError && error.status === 429) {
    return Math.min(2000 * (attemptIndex + 1), 12000);
  }
  return 1000;
}

export function useBegDetailQuery(begId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: begId ? queryKeys.begDetail(begId) : ['begs', 'detail', ''],
    queryFn: async (): Promise<BegFeedItem> => {
      if (!begId) {
        throw new Error('Request id is required');
      }
      const token = await getAccessToken();
      return getBegById(begId, token);
    },
    enabled: Boolean(begId),
    staleTime: STALE_TIMES.begDetail,
    placeholderData: () =>
      begId ? findBegInFeedCache(queryClient, begId) : undefined,
    retry: queryRetry,
    retryDelay: queryRetryDelay,
  });
}

export function useBegDonationsQuery(
  begId: string | undefined,
  options?: { page?: number; limit?: number; enabled?: boolean }
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: begId
      ? queryKeys.begDonations(begId, { page, limit })
      : ['donations', 'beg', ''],
    queryFn: async (): Promise<GetBegDonationsResult> => {
      if (!begId) {
        throw new Error('Request id is required');
      }
      return getBegDonations(begId, { page, limit });
    },
    enabled: Boolean(begId) && enabled,
    staleTime: STALE_TIMES.begDonations,
    retry: queryRetry,
    retryDelay: queryRetryDelay,
  });
}
