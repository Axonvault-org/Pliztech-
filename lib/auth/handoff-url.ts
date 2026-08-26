import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const HANDOFF_PATH = '/handoff';

/** Native deep link for session handoff after web email verification. */
export function getAuthHandoffNativeUrl(code: string): string {
  const trimmed = code.trim();
  if (Platform.OS === 'web') {
    return `plz://handoff?code=${encodeURIComponent(trimmed)}`;
  }
  return Linking.createURL(HANDOFF_PATH, {
    queryParams: { code: trimmed },
  });
}

export function handoffCodeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === 'string' && code.trim()) return code.trim();
  if (Array.isArray(code) && code[0]) return String(code[0]).trim();
  return null;
}
