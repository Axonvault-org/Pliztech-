import { enterSignedOutWelcome } from '@/lib/navigation/auth-navigation';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { useCurrentUser } from '@/contexts/CurrentUserContext';

/**
 * Performs sign-out then redirects to welcome. Open via router from Profile (or elsewhere).
 */
export default function LogoutScreen() {
  const { signOut } = useCurrentUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await signOut();
      if (!cancelled) {
        enterSignedOutWelcome();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signOut]);

  return (
    <View style={styles.container} accessibilityLabel="Signing out">
      <ActivityIndicator size="large" color="#2E8BEA" />
      <Text style={styles.label}>Signing out…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  label: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },
});
