import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { CTAButton } from '@/components/CTAButton';
import { Screen } from '@/components/Screen';
import { WithdrawalHistoryCard } from '@/components/withdraw/WithdrawalHistoryCard';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { PlizApiError } from '@/lib/api/types';
import { getUserWithdrawals, type WithdrawalApiItem } from '@/lib/api/withdrawals';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

const PAGE_SIZE = 20;

export default function WithdrawalHistoryScreen() {
  const { signOut } = useCurrentUser();
  const [items, setItems] = useState<WithdrawalApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(
    async (opts?: { page?: number; append?: boolean; background?: boolean; _retry?: boolean }) => {
      const nextPage = opts?.page ?? 1;
      const append = opts?.append ?? false;
      const background = opts?.background ?? false;
      const retry = opts?._retry ?? false;

      if (!background && !append) setLoading(true);
      if (append) setLoadingMore(true);
      setError(null);

      try {
        const token = await getAccessToken();
        if (!token) {
          setItems([]);
          setError('Sign in to view withdrawal history.');
          return;
        }

        const result = await getUserWithdrawals(token, { page: nextPage, limit: PAGE_SIZE });
        setPage(nextPage);
        setTotalPages(Math.max(1, result.pages));
        setItems((prev) => (append ? [...prev, ...result.withdrawals] : result.withdrawals));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retry) {
          const ok = await recoverFromUnauthorized(signOut);
          if (ok) {
            await load({ page: nextPage, append, background, _retry: true });
            return;
          }
          return;
        }
        setError(
          e instanceof PlizApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Could not load withdrawals'
        );
        if (!append && !background) setItems([]);
      } finally {
        if (!background && !append) setLoading(false);
        if (append) setLoadingMore(false);
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      void load({ page: 1 });
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ page: 1, background: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || refreshing || page >= totalPages) return;
    void load({ page: page + 1, append: true, background: true });
  }, [load, loading, loadingMore, page, refreshing, totalPages]);

  const listEmpty = !loading && !error;

  return (
    <Screen backgroundColor="#FFFFFF" contentStyle={styles.screenContent}>
      <AppHeaderTitleRow title="Withdrawal History" marginBottom={8} />

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E8BEA" />
          <Text style={styles.loadingHint}>Loading withdrawals…</Text>
        </View>
      ) : null}

      {error && !loading && items.length === 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load({ page: 1 })} style={styles.retryWrap}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {listEmpty && items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No withdrawals yet</Text>
          <Text style={styles.emptySub}>
            When you cash out from a funded or expired request, your payout history will appear here.
          </Text>
          <View style={styles.emptyCta}>
            <CTAButton
              label="Withdraw funds"
              onPress={() => router.push('/(tabs)/withdraw-funds')}
              variant="gradient"
              accessibilityLabel="Go to withdraw funds"
            />
          </View>
        </View>
      ) : null}

      {items.length > 0 ? (
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WithdrawalHistoryCard
              item={item}
              onPress={() => router.push(`/(tabs)/request/${item.beg.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2E8BEA" />
              </View>
            ) : null
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingBottom: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  retryWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyCta: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
