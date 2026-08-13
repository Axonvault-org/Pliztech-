import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { getNotificationPreferences } from '@/lib/api/notification-preferences';
import { registerPushToken, unregisterPushToken } from '@/lib/api/push-token';
import { navigateFromPushNotificationData } from '@/lib/navigation/push-notification-navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let lastRegisteredToken: string | null = null;

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}

export async function clearRegisteredPushTokenOnLogout(): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await unregisterPushToken(lastRegisteredToken);
  } catch {
    /* best effort */
  }
  lastRegisteredToken = null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Plz notifications',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function resolveExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || typeof projectId !== 'string') {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  await ensureAndroidChannel();
  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResult.data;
}

export async function syncPushTokenRegistration(): Promise<void> {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.pushEnabled) {
      if (lastRegisteredToken) {
        await unregisterPushToken(lastRegisteredToken);
        lastRegisteredToken = null;
      }
      return;
    }

    const token = await resolveExpoPushToken();
    if (!token) return;

    await registerPushToken({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version,
    });
    lastRegisteredToken = token;
  } catch {
    /* non-blocking */
  }
}

/** Register listeners and sync token when user is authenticated. */
export function usePushNotifications(enabled: boolean): void {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!enabled) return;

    void syncPushTokenRegistration();

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        navigateFromPushNotificationData(data);
      }
    });

    receivedListener.current = Notifications.addNotificationReceivedListener(() => {
      /* Foreground delivery — inbox refetch handled by focus hooks */
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      navigateFromPushNotificationData(data);
    });

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [enabled]);
}
