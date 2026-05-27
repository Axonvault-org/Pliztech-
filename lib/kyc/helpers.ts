import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type PickedKycFile = { uri: string; name: string; type: string; base64?: string };

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value.trim())) return false;
  const parsed = new Date(`${value.trim()}T12:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function isFutureOrTodayIsoDate(value: string): boolean {
  if (!isValidIsoDate(value)) return false;
  const parsed = new Date(`${value.trim()}T23:59:59`);
  return parsed >= new Date();
}

export function isPastOrTodayIsoDate(value: string): boolean {
  if (!isValidIsoDate(value)) return false;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return parsed <= new Date();
}

function mimeFromUri(uri: string, mimeType?: string | null): string {
  if (mimeType) return mimeType;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fileNameFromUri(uri: string, prefix: string): string {
  const segment = uri.split('/').pop();
  if (segment && segment.includes('.')) return segment;
  return `${prefix}-${Date.now()}.jpg`;
}

function normalizePickedFile(
  file: PickedKycFile | null,
  prefix: string
): PickedKycFile | null {
  if (!file) return null;
  return {
    ...file,
    name: file.name.startsWith('kyc') ? `${prefix}-${Date.now()}.jpg` : file.name,
  };
}

async function launchPicker(
  source: 'camera' | 'library',
  options: { base64?: boolean; cameraType?: ImagePicker.CameraType }
): Promise<PickedKycFile | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Permission needed',
      source === 'camera'
        ? 'Allow camera access so you can take a photo.'
        : 'Allow photo access so you can upload your document.'
    );
    return null;
  }

  const picked =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.9,
          base64: options.base64 ?? false,
          cameraType: options.cameraType ?? ImagePicker.CameraType.back,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.9,
          base64: options.base64 ?? false,
        });

  if (picked.canceled || !picked.assets[0]) return null;

  const asset = picked.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? fileNameFromUri(asset.uri, 'kyc'),
    type: mimeFromUri(asset.uri, asset.mimeType),
    base64: asset.base64 ?? undefined,
  };
}

export async function pickKycDocumentFromCamera(prefix: string): Promise<PickedKycFile | null> {
  return normalizePickedFile(await launchPicker('camera', {}), prefix);
}

export async function pickKycDocumentFromLibrary(prefix: string): Promise<PickedKycFile | null> {
  return normalizePickedFile(await launchPicker('library', {}), prefix);
}

export async function pickKycSelfieFromCamera(): Promise<PickedKycFile | null> {
  return launchPicker('camera', {
    base64: true,
    cameraType: ImagePicker.CameraType.front,
  });
}

export async function pickKycSelfieFromLibrary(): Promise<PickedKycFile | null> {
  return launchPicker('library', { base64: true });
}

/** @deprecated Use useKycImagePicker() — Alert.alert multi-button menus fail on web. */
export function pickKycDocumentImage(prefix: string): Promise<PickedKycFile | null> {
  if (Platform.OS === 'web') {
    return pickKycDocumentFromLibrary(prefix);
  }
  return new Promise((resolve) => {
    Alert.alert('Upload document', 'Choose how to add your document photo.', [
      {
        text: 'Take photo',
        onPress: () => void pickKycDocumentFromCamera(prefix).then(resolve),
      },
      {
        text: 'Choose from gallery',
        onPress: () => void pickKycDocumentFromLibrary(prefix).then(resolve),
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** @deprecated Use useKycImagePicker() — Alert.alert multi-button menus fail on web. */
export function pickKycSelfieImage(): Promise<PickedKycFile | null> {
  if (Platform.OS === 'web') {
    return pickKycSelfieFromLibrary();
  }
  return new Promise((resolve) => {
    Alert.alert('Take a selfie', 'Use a clear, well-lit photo of your face.', [
      {
        text: 'Take selfie',
        onPress: () => void pickKycSelfieFromCamera().then(resolve),
      },
      {
        text: 'Choose from gallery',
        onPress: () => void pickKycSelfieFromLibrary().then(resolve),
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Resolve base64 for face-liveness API (native picker or web FileReader). */
export async function kycImageToBase64(file: PickedKycFile): Promise<string> {
  if (file.base64) return file.base64;

  if (Platform.OS === 'web' && typeof FileReader !== 'undefined') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read selfie image.'));
      reader.onloadend = () => {
        const result = String(reader.result ?? '');
        resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
      };
      reader.readAsDataURL(blob);
    });
  }

  throw new Error('Could not read selfie image. Please try taking the photo again.');
}
