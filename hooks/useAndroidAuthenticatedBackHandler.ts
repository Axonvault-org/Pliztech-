import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * On Android, block the hardware back key from popping the root stack into
 * welcome/login while the user is signed in. Inner (tabs) stack screens still
 * pop normally (request detail, settings, etc.).
 */
export function useAndroidAuthenticatedBackHandler(enabled: boolean): void {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !enabled) {
        return undefined;
      }

      const onBackPress = () => {
        if (navigation.canGoBack()) {
          return false;
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [enabled, navigation])
  );
}
