import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

import { navigateToHome } from '@/lib/navigation/home-navigation';

/** Android hardware back → application home page while this screen is focused. */
export function useHardwareBackToHome(): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        navigateToHome();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );
}
