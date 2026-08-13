import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { Text } from '@/components/Text';

import { ActivityRequestCard } from '@/components/activity/ActivityRequestCard';
import { ActivityTypeFilters, type ActivityType } from '@/components/activity/ActivityTypeFilters';
import { CommunityStories } from '@/components/activity/CommunityStories';
import { GivingCard } from '@/components/activity/GivingCard';
import { GivingSummaryCards } from '@/components/activity/GivingSummaryCards';
import { PastRequestOverlay } from '@/components/activity/PastRequestOverlay';
import { SummaryCards } from '@/components/activity/SummaryCards';
import { AppHeaderLogoRow } from '@/components/layout/AppHeaderLogoRow';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useStoryIndicator } from '@/contexts/StoryIndicatorContext';
import {
    begFeedItemToActivityRequest,
    getBegById,
    getMyBegs,
    summarizeActivityRequests,
} from '@/lib/api/beg';
import {
    getMyDonations,
    myDonationToGivingContribution,
    summarizeGivingDonations,
} from '@/lib/api/donations';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
    isUnauthorizedSessionError,
    recoverFromUnauthorized,
} from '@/lib/auth/session-expired';
import { consumeStashedPastOverlayBegId } from '@/lib/navigation/post-donation-navigation';
import type { ActivityRequest, GivingContribution } from '@/lib/types/activity';

const MY_BEGS_PAGE_LIMIT = 100;
const MY_DONATIONS_PAGE_LIMIT = 200;

function firstQueryParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

export default function ActivityScreen() {
  const { signOut } = useCurrentUser();
  const { hasUnseenStories, markStoriesSeen, refreshStoryStatus } = useStoryIndicator();
  const params = useLocalSearchParams<{ openPastBeg?: string | string[] }>();
  const openPastBegParam = useMemo(
    () => firstQueryParam(params.openPastBeg),
    [params.openPastBeg]
  );

  const [activeTab, setActiveTab] = useState<ActivityType>('requests');

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsAuthRequired, setRequestsAuthRequired] = useState(false);
  const [myRequests, setMyRequests] = useState<ActivityRequest[]>([]);
  const [requestsSummary, setRequestsSummary] = useState({
    total: 0,
    funded: 0,
    active: 0,
  });

  const [givingLoading, setGivingLoading] = useState(false);
  const [givingError, setGivingError] = useState<string | null>(null);
  const [givingAuthRequired, setGivingAuthRequired] = useState(false);
  const [myGiving, setMyGiving] = useState<GivingContribution[]>([]);
  const [givingSummary, setGivingSummary] = useState({
    totalGiven: 0,
    peopleHelped: 0,
    thisMonth: 0,
    avgGift: 0,
  });

  /** Past / closed request detail overlay (funded, expired, cancelled). */
  const [pastOverlayRequest, setPastOverlayRequest] = useState<ActivityRequest | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshStoryStatus();
    }, [refreshStoryStatus])
  );

  useEffect(() => {
    if (activeTab === 'stories') {
      void markStoriesSeen();
    }
  }, [activeTab, markStoriesSeen]);

  const loadMyRequests = useCallback(
    async (opts?: { _retryAfterRefresh?: boolean }) => {
      const retryAfterRefresh = opts?._retryAfterRefresh ?? false;
      setRequestsLoading(true);
      setRequestsError(null);
      setRequestsAuthRequired(false);
      try {
        const token = await getAccessToken();
        if (!token) {
          setRequestsAuthRequired(true);
          setMyRequests([]);
          setRequestsSummary({ total: 0, funded: 0, active: 0 });
          return;
        }

        const result = await getMyBegs(token, { page: 1, limit: MY_BEGS_PAGE_LIMIT });
        const rows = result.begs.map(begFeedItemToActivityRequest);
        setMyRequests(rows);

        const partial = summarizeActivityRequests(result.begs);
        setRequestsSummary({
          total: result.pagination.total,
          funded: partial.funded,
          active: partial.active,
        });
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadMyRequests({ _retryAfterRefresh: true });
            return;
          }
          return;
        }
        setMyRequests([]);
        setRequestsSummary({ total: 0, funded: 0, active: 0 });
        setRequestsError(
          formatPlizApiErrorForUser(e)
        );
      } finally {
        setRequestsLoading(false);
      }
    },
    [signOut]
  );

  const loadMyGiving = useCallback(
    async (opts?: { _retryAfterRefresh?: boolean }) => {
      const retryAfterRefresh = opts?._retryAfterRefresh ?? false;
      setGivingLoading(true);
      setGivingError(null);
      setGivingAuthRequired(false);
      try {
        const token = await getAccessToken();
        if (!token) {
          setGivingAuthRequired(true);
          setMyGiving([]);
          setGivingSummary({
            totalGiven: 0,
            peopleHelped: 0,
            thisMonth: 0,
            avgGift: 0,
          });
          return;
        }

        const result = await getMyDonations(token, {
          page: 1,
          limit: MY_DONATIONS_PAGE_LIMIT,
        });
        const rows = result.donations.map(myDonationToGivingContribution);
        setMyGiving(rows);
        setGivingSummary(summarizeGivingDonations(result.donations));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadMyGiving({ _retryAfterRefresh: true });
            return;
          }
          return;
        }
        setMyGiving([]);
        setGivingSummary({
          totalGiven: 0,
          peopleHelped: 0,
          thisMonth: 0,
          avgGift: 0,
        });
        setGivingError(
          formatPlizApiErrorForUser(e)
        );
      } finally {
        setGivingLoading(false);
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      const fromSession = consumeStashedPastOverlayBegId();
      const overlayBegId = openPastBegParam || fromSession;
      if (overlayBegId) {
        void (async () => {
          try {
            const beg = await getBegById(overlayBegId);
            setActiveTab('requests');
            setPastOverlayRequest(begFeedItemToActivityRequest(beg));
          } catch {
            /* ignore — user can open the request from Giving if needed */
          }
          if (openPastBegParam) {
            router.setParams({ openPastBeg: undefined });
          }
        })();
      }

      if (activeTab === 'requests') {
        void loadMyRequests();
      }
      if (activeTab === 'giving') {
        void loadMyGiving();
      }
    }, [activeTab, loadMyRequests, loadMyGiving, openPastBegParam])
  );

  const handleActivityRequestPress = useCallback((item: ActivityRequest) => {
    if (item.status === 'active' || item.status === 'pending') {
      router.push({ pathname: '/(tabs)/request/[id]', params: { id: item.id } });
      return;
    }
    setPastOverlayRequest(item);
  }, []);

  const renderRequestItem = useCallback(
    ({ item }: { item: ActivityRequest }) => (
      <ActivityRequestCard request={item} onRequestPress={handleActivityRequestPress} />
    ),
    [handleActivityRequestPress]
  );

  const renderGivingItem = useCallback(
    ({ item }: { item: GivingContribution }) => (
      <GivingCard contribution={item} />
    ),
    []
  );

  const handleActivityTabChange = useCallback(
    (tab: ActivityType) => {
      setActiveTab(tab);
      if (tab === 'stories') {
        void markStoriesSeen();
      }
    },
    [markStoriesSeen]
  );

  const renderEmptyGiving = () => {
    if (givingLoading) return null;
    if (givingAuthRequired) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sign in to see your giving</Text>
          <Text style={styles.emptySubtitle}>
            Log in to view donations you&apos;ve made on Plz.
          </Text>
          <Pressable
            style={styles.primaryCta}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.primaryCtaLabel}>Log in</Text>
          </Pressable>
        </View>
      );
    }
    if (givingError) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No giving activity yet</Text>
        <Text style={styles.emptySubtitle}>
          When you support others, your contributions will appear here.
        </Text>
      </View>
    );
  };

  const renderEmptyRequests = () => {
    if (requestsLoading) return null;
    if (requestsAuthRequired) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sign in to see your requests</Text>
          <Text style={styles.emptySubtitle}>
            Log in to view requests you&apos;ve posted on Plz.
          </Text>
          <Pressable
            style={styles.primaryCta}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.primaryCtaLabel}>Log in</Text>
          </Pressable>
        </View>
      );
    }
    if (requestsError) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No requests yet</Text>
        <Text style={styles.emptySubtitle}>
          When you ask for help, your requests will show up here.
        </Text>
        <Pressable
          style={styles.primaryCta}
          onPress={() => router.push('/(tabs)/(main)/create')}
          accessibilityRole="button"
          accessibilityLabel="Create a request"
        >
          <Text style={styles.primaryCtaLabel}>Ask for help</Text>
        </Pressable>
      </View>
    );
  };

  const requestsData = activeTab === 'requests' ? myRequests : [];
  const givingData = activeTab === 'giving' ? myGiving : [];
  const storiesData: GivingContribution[] = [];

  const listData = activeTab === 'requests' ? requestsData : activeTab === 'giving' ? givingData : storiesData;
  const renderItem =
    activeTab === 'requests'
      ? renderRequestItem
      : activeTab === 'giving'
        ? renderGivingItem
        : renderRequestItem;
  const ListEmptyComponent =
    activeTab === 'giving' && givingData.length === 0
      ? renderEmptyGiving
      : activeTab === 'requests'
        ? renderEmptyRequests
        : undefined;

  type ListItem = ActivityRequest | GivingContribution;
  const typedListData = listData as ListItem[];
  const typedRenderItem = renderItem as (info: { item: ListItem }) => React.ReactElement;

  const listHeader = (
    <>
      <ActivityTypeFilters
        activeTab={activeTab}
        onTabChange={handleActivityTabChange}
        showStoriesDot={hasUnseenStories}
      />
      {activeTab === 'requests' && (
        <>
          <SummaryCards
            total={requestsSummary.total}
            funded={requestsSummary.funded}
            active={requestsSummary.active}
          />
          {requestsLoading ? (
            <View style={styles.requestsLoading}>
              <ActivityIndicator size="small" color="#2E8BEA" />
              <Text style={styles.requestsLoadingText}>Loading your requests…</Text>
            </View>
          ) : null}
          {requestsError ? (
            <View style={styles.inlineNotice}>
              <Text style={styles.inlineNoticeText}>{requestsError}</Text>
              <Pressable
                onPress={() => void loadMyRequests()}
                style={styles.retryLink}
                accessibilityRole="button"
                accessibilityLabel="Retry loading requests"
              >
                <Text style={styles.retryLinkText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
      {activeTab === 'giving' && (
        <>
          <GivingSummaryCards
            totalGiven={givingSummary.totalGiven}
            peopleHelped={givingSummary.peopleHelped}
            thisMonth={givingSummary.thisMonth}
            avgGift={givingSummary.avgGift}
          />
          {givingLoading ? (
            <View style={styles.requestsLoading}>
              <ActivityIndicator size="small" color="#2E8BEA" />
              <Text style={styles.requestsLoadingText}>Loading your giving…</Text>
            </View>
          ) : null}
          {givingError ? (
            <View style={styles.inlineNotice}>
              <Text style={styles.inlineNoticeText}>{givingError}</Text>
              <Pressable
                onPress={() => void loadMyGiving()}
                style={styles.retryLink}
                accessibilityRole="button"
                accessibilityLabel="Retry loading giving history"
              >
                <Text style={styles.retryLinkText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
      {activeTab === 'stories' && <CommunityStories />}
    </>
  );

  return (
    <Screen backgroundColor="#FFFFFF">
      <AppHeaderLogoRow />

      <FlatList<ListItem>
        data={typedListData}
        renderItem={typedRenderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          (listData.length === 0 || activeTab === 'stories') && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <PastRequestOverlay
        visible={pastOverlayRequest != null}
        summary={pastOverlayRequest}
        onClose={() => setPastOverlayRequest(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  requestsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  requestsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  inlineNotice: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  inlineNoticeText: {
    fontSize: 14,
    color: '#B45309',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  primaryCta: {
    backgroundColor: '#2E8BEA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
