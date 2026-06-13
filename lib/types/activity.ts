import Ionicons from '@expo/vector-icons/Ionicons';

export type ActivityRequestStatus =
  | 'funded'
  | 'active'
  | 'pending'
  | 'expired'
  | 'withdrawn'
  | 'cancelled';

/** UI row for Activity → Requests (API-mapped). */
export type ActivityRequest = {
  id: string;
  title: string;
  timeAgo: string;
  /** From API `expiresAt` — e.g. "2h left", "Expired". */
  expiresLabel?: string;
  status: ActivityRequestStatus;
  amount: number;
  categoryId: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** UI row for Activity → Giving (API-mapped). */
export type GivingContribution = {
  id: string;
  requestId: string;
  recipientName: string;
  recipientInitial: string;
  recipientColor: string;
  description: string;
  amount: number;
  timeAgo: string;
  categoryId: string;
  icon: keyof typeof Ionicons.glyphMap;
};
