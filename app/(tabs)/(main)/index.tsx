import { router } from 'expo-router';
import { useCallback } from 'react';

import { HomeHeader } from '@/components/home/HomeHeader';
import { ImpactCard } from '@/components/home/ImpactCard';
import { QuickActions } from '@/components/home/QuickActions';
import { RecentContributions } from '@/components/home/RecentContributions';
import { TrendingRequests } from '@/components/home/TrendingRequests';
import {
  avatarColorFromSeed,
  displayFirstName,
  displayMemberRoleLabel,
  displayProfileHeader,
  useCurrentUser,
} from '@/contexts/CurrentUserContext';

import { PlizApiError } from '@/lib/api/types';
import type { TrendingRequest } from '@/lib/types/home';

import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import {
  useProfilePictureQuery,
  useRecentContributionsQuery,
  useTrendingBegsQuery,
} from '@/hooks/queries/useHomeQueries';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_CONTRIBUTIONS_HOME_LIMIT = 5;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, signOut, refreshUser } = useCurrentUser();
  const { unreadCount, refreshUnreadCount } = useUnreadNotificationCount();

  const trendingQuery = useTrendingBegsQuery(5);
  const recentQuery = useRecentContributionsQuery(RECENT_CONTRIBUTIONS_HOME_LIMIT, signOut);
  const profilePictureQuery = useProfilePictureQuery(signOut);

  const trending: TrendingRequest[] = trendingQuery.data ?? [];
  const trendingLoading = trendingQuery.isLoading;
  const recentContributions = recentQuery.data ?? [];
  const recentLoading = recentQuery.isLoading;
  const profilePicture = profilePictureQuery.data ?? null;

  const refreshing =
    !trendingLoading &&
    !recentLoading &&
    (trendingQuery.isFetching ||
      recentQuery.isFetching ||
      profilePictureQuery.isFetching);

  const onRefresh = useCallback(() => {
    void Promise.all([
      trendingQuery.refetch(),
      recentQuery.refetch(),
      profilePictureQuery.refetch(),
      refreshUser(),
      refreshUnreadCount(),
    ]);
  }, [
    trendingQuery,
    recentQuery,
    profilePictureQuery,
    refreshUser,
    refreshUnreadCount,
  ]);

  const trendingError =
    trendingQuery.error instanceof PlizApiError
      ? trendingQuery.error.message
      : trendingQuery.error instanceof Error
        ? trendingQuery.error.message
        : trendingQuery.isError
          ? 'Could not load trending requests'
          : null;

  const firstName = isLoading && !user ? '…' : displayFirstName(user) || 'Guest';
  const role = user ? displayMemberRoleLabel(user) : isLoading ? '…' : 'Member';
  const header = displayProfileHeader(user);
  const seed = user?.username ?? user?.email ?? '';
  const avatarColor = seed ? avatarColorFromSeed(seed) : '#2E8BEA';
  const avatarUrl = profilePicture?.displayUrl ?? user?.avatar?.displayUrl ?? null;

  const impactStats = user?.stats;
  const totalGiven = Math.round(Number(impactStats?.totalDonated) || 0);
  const peopleHelped = impactStats?.peopleHelped ?? 0;
  const weeklyHelped = impactStats?.peopleHelpedThisWeek ?? 0;

  const recentEmptyMessage = (() => {
    if (recentLoading || recentContributions.length > 0) return null;
    if (!user && !isLoading) {
      return 'Sign in to see your recent contributions.';
    }
    if (user) {
      return 'No contributions yet. Browse requests to help someone.';
    }
    return null;
  })();

  const onAskForHelp = () => {
    router.push('/(tabs)/(main)/create');
  };

  const onBrowseRequests = () => {
    router.push('/(tabs)/(main)/browse');
  };

  const onSeeAll = () => {
    router.push('/(tabs)/(main)/browse');
  };

  const onSeeAllContributions = () => {
    router.push('/(tabs)/(main)/activity');
  };

  const onCommunityStories = () => {
    router.push('/(tabs)/stories-feed' as import('expo-router').Href);
  };

  const onNotifications = () => {
    router.push('/(tabs)/notifications');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} collapsable={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E8BEA" />
        }
      >
        <HomeHeader
          firstName={firstName}
          role={role}
          onNotificationPress={onNotifications}
          unreadNotificationCount={unreadCount}
          avatarColor={avatarColor}
          avatarUrl={avatarUrl}
          initials={header.initials}
          maskAvatar={header.maskAvatar}
          previewPhoto
        />
        <ImpactCard
          totalGiven={totalGiven}
          peopleHelped={peopleHelped}
          weeklyHelped={weeklyHelped}
        />
        <QuickActions
          onAskForHelp={onAskForHelp}
          onBrowseRequests={onBrowseRequests}
        />
        <TrendingRequests
          requests={trending}
          loading={trendingLoading}
          errorMessage={trendingError}
          onRetry={() => void trendingQuery.refetch()}
          onSeeAll={onSeeAll}
        />
        <RecentContributions
          contributions={recentContributions}
          loading={recentLoading}
          emptyMessage={recentEmptyMessage}
          onSeeAll={onSeeAllContributions}
          onCommunityStories={onCommunityStories}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
});
