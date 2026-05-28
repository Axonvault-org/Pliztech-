import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Text } from '@/components/Text';
import { BrowseRequestCard } from '@/components/browse/BrowseRequestCard';
import { AppHeaderLogoRow } from '@/components/layout/AppHeaderLogoRow';
import { FilterChips, type MainFilter } from '@/components/browse/FilterChips';
import { SearchBar } from '@/components/browse/SearchBar';
import { Screen } from '@/components/Screen';
import {
  feedBegToBrowseRequest,
  getBegsFeed,
  uiCategoryToApiCategory,
} from '@/lib/api/beg';
import { PlizApiError } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/query-keys';
import { STALE_TIMES } from '@/lib/query/stale-times';
import type { BrowseRequest } from '@/lib/types/home';

export default function BrowseScreen() {
  const [search, setSearch] = useState('');
  const [mainFilter, setMainFilter] = useState<MainFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const apiCategory =
    categoryFilter === 'all' ? undefined : uiCategoryToApiCategory(categoryFilter);

  const begsQuery = useQuery({
    queryKey: queryKeys.begsFeed({ page: 1, limit: 50, category: apiCategory }),
    queryFn: async () => {
      const { begs } = await getBegsFeed({
        page: 1,
        limit: 50,
        category: apiCategory,
      });
      return begs.map(feedBegToBrowseRequest);
    },
    staleTime: STALE_TIMES.begsFeed,
  });

  const requests = begsQuery.data ?? [];
  const loading = begsQuery.isLoading;
  const refreshing = begsQuery.isFetching && !begsQuery.isLoading;
  const error =
    begsQuery.error instanceof PlizApiError
      ? begsQuery.error.message
      : begsQuery.error instanceof Error
        ? begsQuery.error.message
        : begsQuery.isError
          ? 'Could not load requests'
          : null;

  const onRefresh = useCallback(() => {
    void begsQuery.refetch();
  }, [begsQuery]);

  const filteredRequests = useMemo(() => {
    let list: BrowseRequest[] = [...requests];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q) ||
          r.categoryLabel.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      list = list.filter((r) => r.categoryId === categoryFilter);
    }

    if (mainFilter === 'ending-soon') {
      list.sort((a, b) => {
        if (a.expiresAt && b.expiresAt) {
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        }
        const parseHours = (s: string) => {
          const d = s.match(/(\d+)d/);
          const h = s.match(/(\d+)h/);
          const m = s.match(/(\d+)m/);
          let hours = 999;
          if (d) hours = parseInt(d[1]!, 10) * 24 + (h ? parseInt(h[1]!, 10) : 0);
          else if (h) hours = parseInt(h[1]!, 10);
          else if (m) hours = parseInt(m[1]!, 10) / 60;
          return hours;
        };
        return parseHours(a.timeLeft) - parseHours(b.timeLeft);
      });
    } else if (mainFilter === 'just-posted') {
      list.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
    }

    return list;
  }, [search, mainFilter, categoryFilter, requests]);

  const renderItem = useCallback(
    ({ item }: { item: BrowseRequest }) => <BrowseRequestCard request={item} />,
    []
  );

  const ListHeader = useMemo(
    () => (
      <>
        <SearchBar value={search} onChangeText={setSearch} />
        <FilterChips
          mainFilter={mainFilter}
          onMainFilterChange={setMainFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />
        {error ? (
          <Pressable
            onPress={() => void begsQuery.refetch()}
            style={styles.errorBanner}
            accessibilityRole="button"
            accessibilityLabel="Retry loading requests"
          >
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Tap to retry</Text>
          </Pressable>
        ) : null}
      </>
    ),
    [search, mainFilter, categoryFilter, error, begsQuery]
  );

  return (
    <Screen backgroundColor="#FFFFFF">
      <AppHeaderLogoRow />

      <FlatList
        data={filteredRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F2937" />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color="#2E8BEA" />
              <Text style={styles.emptyHint}>Loading requests…</Text>
            </View>
          ) : !error ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyHint}>No requests match your filters.</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  errorRetry: {
    fontSize: 13,
    color: '#2E8BEA',
    marginTop: 6,
    fontWeight: '600',
  },
});
