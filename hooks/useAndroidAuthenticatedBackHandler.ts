import { useFocusEffect, useNavigation, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

const AUTHENTICATED_ROOT_PATHS = new Set(['/', '/browse', '/create', '/activity', '/profile']);

/**
 * On Android, block the hardware back key from popping the root stack into
 * welcome/login while the user is signed in. Inner (tabs) stack screens still
 * pop normally (request detail, settings, etc.).
 */
export function useAndroidAuthenticatedBackHandler(enabled: boolean): void {
  const navigation = useNavigation();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !enabled) {
        return undefined;
      }

      const onBackPress = () => {
        if (!AUTHENTICATED_ROOT_PATHS.has(pathname)) {
          return false;
        }

        if (navigation.canGoBack()) {
          return false;
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [enabled, navigation, pathname])
  );
}
