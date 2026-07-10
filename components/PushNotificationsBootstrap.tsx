import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/** Mount inside authenticated tab stack to wire Expo push token + tap handlers. */
export function PushNotificationsBootstrap() {
  const { user } = useCurrentUser();
  usePushNotifications(Boolean(user));
  return null;
}
