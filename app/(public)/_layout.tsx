import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  AUTHENTICATED_HOME,
  SIGNUP_PROFILE,
} from '@/lib/navigation/auth-navigation';

export default function PublicLayout() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading && !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E8BEA" />
      </View>
    );
  }

  if (user?.isProfileComplete) {
    return <Redirect href={AUTHENTICATED_HOME} />;
  }

  if (user && !user.isProfileComplete) {
    return <Redirect href={SIGNUP_PROFILE} />;
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
