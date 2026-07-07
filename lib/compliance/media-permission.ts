import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';

const SEEN_PREFIX = 'pliz_permission_rationale_seen_';

export type MediaPermissionKind = 'camera' | 'photos';

function storageKey(kind: MediaPermissionKind): string {
  return `${SEEN_PREFIX}${kind}`;
}

export async function hasSeenPermissionRationale(kind: MediaPermissionKind): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const value = await SecureStore.getItemAsync(storageKey(kind));
    return value === '1';
  } catch {
    return false;
  }
}

async function markPermissionRationaleSeen(kind: MediaPermissionKind): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(storageKey(kind), '1');
  } catch {
    /* non-fatal */
  }
}

const RATIONALE_COPY: Record<MediaPermissionKind, { title: string; message: string }> = {
  camera: {
    title: 'Camera access',
    message:
      'Plz uses your camera for profile photos, identity verification (KYC), and optional request evidence. Continue to allow camera access when prompted.',
  },
  photos: {
    title: 'Photo library access',
    message:
      'Plz uses your photo library for profile pictures, KYC documents, and optional request evidence. Continue to allow photo access when prompted.',
  },
};

/**
 * Shows a one-time rationale (Alert) before the OS permission dialog on native.
 */
export async function ensurePermissionRationale(kind: MediaPermissionKind): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  if (await hasSeenPermissionRationale(kind)) return true;

  const copy = RATIONALE_COPY[kind];
  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.message, [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Continue',
        onPress: () => {
          void markPermissionRationaleSeen(kind);
          resolve(true);
        },
      },
    ]);
  });
}
