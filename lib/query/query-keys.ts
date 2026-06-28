export const queryKeys = {
  me: ['me'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  supportUnreadCount: ['support', 'unread-count'] as const,
  profilePicture: ['profile-picture'] as const,
  begsFeed: (params: { page: number; limit: number; category?: string }) =>
    ['begs', 'feed', params] as const,
  trendingBegs: (limit: number) => ['begs', 'trending', limit] as const,
  myDonations: (params: { page: number; limit: number }) =>
    ['donations', 'mine', params] as const,
};
