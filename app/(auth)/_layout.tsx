import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  AUTHENTICATED_HOME,
  SIGNUP_PROFILE,
} from '@/lib/navigation/auth-navigation';

const PROFILE_COMPLETION_ROUTES = new Set(['signup-profile', 'verify-email']);

export default function AuthLayout() {
  const { user, isLoading } = useCurrentUser();
  const segments = useSegments();
  const routeName = segments[segments.length - 1] ?? '';
  const onProfileCompletionRoute = PROFILE_COMPLETION_ROUTES.has(routeName);

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

  if (user && !user.isProfileComplete && !onProfileCompletionRoute) {
    return <Redirect href={SIGNUP_PROFILE} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding-1" />
      <Stack.Screen name="onboarding-2" />
      <Stack.Screen name="onboarding-3" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="signup-profile" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="forgot-password-confirmation" />
      <Stack.Screen name="reset-password" />
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
