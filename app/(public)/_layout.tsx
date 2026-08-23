import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { AUTHENTICATED_HOME } from '@/lib/navigation/auth-navigation';

export default function PublicLayout() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading && !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E8BEA" />
      </View>
    );
  }

  if (user) {
    return <Redirect href={AUTHENTICATED_HOME} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
