export const STALE_TIMES = {
  /** Current user profile + stats */
  me: 2 * 60 * 1000,
  /** Notification badge */
  unreadCount: 60 * 1000,
  /** Public beg feeds */
  begsFeed: 2 * 60 * 1000,
  /** Profile picture URL */
  profilePicture: 2 * 60 * 1000,
  /** Recent donations on home */
  myDonations: 2 * 60 * 1000,
} as const;
