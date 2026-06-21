import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { StoryIndicatorProvider } from '@/contexts/StoryIndicatorContext';
import { useAndroidAuthenticatedBackHandler } from '@/hooks/useAndroidAuthenticatedBackHandler';

export const unstable_settings = {
  initialRouteName: '(main)',
};

/**
 * All routes in this stack require an authenticated session (valid token + /me user).
 * Unauthenticated visits (e.g. web /profile) redirect to login.
 */
export default function TabLayout() {
  const { user, isLoading } = useCurrentUser();
  const segments = useSegments();
  const isCommunityPurseRoute = (segments as readonly string[]).some((segment) =>
    segment === 'community-purse' || segment === 'community-pulse'
  );

  useAndroidAuthenticatedBackHandler(Boolean(user));

  /** Only block the tab stack during the initial session resolve, not background `/me` refetches. */
  if (isLoading && !user) {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator size="large" color="#2E8BEA" />
      </View>
    );
  }

  if (!user && !isCommunityPurseRoute) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <StoryIndicatorProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="request/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="withdraw-funds" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="withdrawal-history" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="payment-cards" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="personal-info" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="edit-personal-info" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="security-settings" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="transaction-pin" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="change-password" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen
          name="change-password-success"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="logout" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="account-settings" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="stories-feed" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="community-purse" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="community-pulse" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="share-story" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="kyc-verification" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="kyc-nin-verification" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen
          name="kyc-verification-complete"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen name="profile-picture" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="support" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="report-issue" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="legal" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </StoryIndicatorProvider>
  );
}

const styles = StyleSheet.create({
  authLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
