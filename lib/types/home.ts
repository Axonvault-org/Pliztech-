/** Home dashboard trending row (API-mapped). */
export type TrendingRequest = {
  id: string;
  name: string;
  initial: string;
  avatarColor: string;
  avatarUrl?: string | null;
  timeAgo: string;
  /** Time until request expires (from API `expiresAt`). */
  expiresInLabel?: string;
  text: string;
  raised: number;
  goal: number;
  percent: number;
  /** ISO date for client-side sort (API). */
  createdAt?: string;
  ownerUserId?: string;
  /** When true, show the quick donate CTA on the card. */
  canDonate?: boolean;
};

/** Home “My recent contributions” row (API-mapped). */
export type RecentContribution = {
  id: string;
  /** Recipient you donated to (or “Community member” if anonymous gift). */
  contributorName: string;
  description: string;
  amount: number;
  timeAgo: string;
};

/** Browse feed card shape (API-mapped). */
export type BrowseRequest = {
  id: string;
  name: string;
  initial: string;
  avatarColor: string;
  avatarUrl?: string | null;
  timeLeft: string;
  categoryId: string;
  categoryLabel: string;
  badge?: string;
  text: string;
  raised: number;
  goal: number;
  percent: number;
  /** ISO timestamps when mapped from API (for client-side sort). */
  createdAt?: string;
  expiresAt?: string;
  ownerUserId?: string;
  canDonate?: boolean;
};
