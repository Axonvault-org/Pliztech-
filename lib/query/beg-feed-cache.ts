import type { QueryClient } from '@tanstack/react-query';

import type { BegFeedItem } from '@/lib/api/beg';

type FeedQueryData = { begs?: BegFeedItem[] } | BegFeedItem[] | undefined;

function begsFromFeedData(data: FeedQueryData): BegFeedItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.begs ?? [];
}

/** Reuse a beg from any cached feed/trending query for instant detail placeholder. */
export function findBegInFeedCache(
  queryClient: QueryClient,
  begId: string
): BegFeedItem | undefined {
  if (!begId) return undefined;

  const feedEntries = queryClient.getQueriesData<FeedQueryData>({
    queryKey: ['begs', 'feed'],
  });
  for (const [, data] of feedEntries) {
    const hit = begsFromFeedData(data).find((b) => b.id === begId);
    if (hit) return hit;
  }

  const trendingEntries = queryClient.getQueriesData<BegFeedItem[]>({
    queryKey: ['begs', 'trending'],
  });
  for (const [, data] of trendingEntries) {
    const hit = data?.find((b) => b.id === begId);
    if (hit) return hit;
  }

  return undefined;
}
