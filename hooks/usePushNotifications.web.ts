/** Web stub — Expo push is native-only; avoids loading expo-notifications on web. */

export function getLastRegisteredPushToken(): string | null {
  return null;
}

export async function clearRegisteredPushTokenOnLogout(): Promise<void> {
  /* no-op */
}

export async function syncPushTokenRegistration(): Promise<void> {
  /* no-op */
}

export function usePushNotifications(_enabled: boolean): void {
  /* no-op */
}
