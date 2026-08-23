import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { AUTHENTICATED_HOME } from '@/lib/navigation/auth-navigation';

/** Signed-in users may stay on these auth routes (verify link, deferred profile completion). */
const AUTH_ROUTES_WHILE_SIGNED_IN = new Set(['verify-email', 'signup-profile']);

export default function AuthLayout() {
  const { user, isLoading } = useCurrentUser();
  const segments = useSegments();
  const routeName = segments[segments.length - 1] ?? '';

  if (isLoading && !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E8BEA" />
      </View>
    );
  }

  if (user && !AUTH_ROUTES_WHILE_SIGNED_IN.has(routeName)) {
    return <Redirect href={AUTHENTICATED_HOME} />;
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
